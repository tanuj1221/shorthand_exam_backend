// expertAuthentication.js
const connection = require('../../config/db1');

// Authentication functions
exports.loginExpertAdmin = async (req, res) => {
    console.log("Trying expert admin login");
    const { expertId, password } = req.body;
    console.log("expertId: "+ expertId + " password: "+ password);
    const expertQuery = 'SELECT expertId, password, expert_name FROM expertdb WHERE expertId = ?';

    try {
        const [results] = await connection.query(expertQuery, [expertId]);
        if (results.length > 0) {
            const expert = results[0];
            console.log("data: "+expert);
            console.log(expert)
            
            if (expert.password === password) {
                // Set expert session
                req.session.expertId = expert.expertId;
                req.session.expert_name = expert.expert_name;
                
                res.status(200).json({
                    message: 'Logged in successfully as an expert!',
                    expertId: expert.expertId
                });
                
            } else {
                res.status(401).send('Invalid credentials for expert');
            }
        } else {
            res.status(404).send('Expert not found');
        }
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).send(err.message);
    }
};

exports.logoutExpert = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const expertId = req.session.expertId;

    let conn;
    try {
        conn = await connection.getConnection();

        const updateStatusQuery = `
            UPDATE modreviewlog 
            SET status = 0
            WHERE expertId = ?
        `;
        await conn.query(updateStatusQuery, [expertId]);

        // Clear the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ error: 'Error logging out' });
            }
            res.status(200).json({ message: 'Logged out successfully' });
        });

    } catch (err) {
        console.error("Error logging out expert:", err);
        res.status(500).json({ error: 'Error logging out' });
    } finally {
        if (conn) conn.release();
    }
};

exports.getExpertDetails = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    res.status(200).json({
        expertId: req.session.expertId,
        expert_name: req.session.expert_name
    });
};

exports.getAllSubjects = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const subjectsQuery = `
        SELECT 
            s.subjectId, 
            s.subject_name, 
            s.subject_name_short, 
            s.daily_timer, 
            s.passage_timer, 
            s.demo_timer,
            COUNT(DISTINCT CASE WHEN m.subm_done IS NULL OR m.subm_done = 0 THEN m.student_id END) AS incomplete_count,
            COUNT(DISTINCT m.student_id) AS total_count
        FROM 
            subjectsdb s
        LEFT JOIN 
            modreviewlog m ON s.subjectId = m.subjectId AND m.expertId = ?
        GROUP BY 
            s.subjectId, s.subject_name, s.subject_name_short, s.daily_timer, s.passage_timer, s.demo_timer
        HAVING 
            incomplete_count > 0;
    `;

    try {
        const [results] = await connection.query(subjectsQuery, [req.session.expertId]);
        
        // Console log the subjects and their student counts
        console.log("Subjects available for expert with student counts:");
        results.forEach(subject => {
            console.log(`Subject ID: ${subject.subjectId}, Name: ${subject.subject_name}, Incomplete Count: ${subject.incomplete_count}, Total Count: ${subject.total_count}`);
        });

        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching subjects:", err);
        res.status(500).json({ error: 'Error fetching subjects' });
    }
};

exports.getQSetsForSubject = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId } = req.params;
    const expertId = req.session.expertId;

    try {
        const qsetQuery = `
            SELECT 
                qset, 
                COUNT(DISTINCT CASE WHEN subm_done IS NULL OR subm_done = 0 THEN student_id END) as incomplete_count,
                COUNT(DISTINCT student_id) as total_count
            FROM modreviewlog 
            WHERE subjectId = ?
            AND expertId = ?
            GROUP BY qset
            HAVING incomplete_count > 0
            ORDER BY qset
        `;
        const [qsetResults] = await connection.query(qsetQuery, [subjectId, expertId]);

        console.log(`QSets for subject ${subjectId} and expert ${expertId} with student counts:`);
        qsetResults.forEach(qset => {
            console.log(`QSet: ${qset.qset}, Incomplete Count: ${qset.incomplete_count}, Total Count: ${qset.total_count}`);
        });

        res.status(200).json(qsetResults);
    } catch (err) {
        console.error("Error fetching qsets:", err);
        res.status(500).json({ error: 'Error fetching qsets' });
    }
};

// Expert assignment and passage retrieval routes
exports.getExpertAssignedPassages = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset } = req.params;
    const expertId = req.session.expertId;

    try {
        const query = `
            SELECT passageA, passageB, ansPassageA, ansPassageB, student_id
            FROM modreviewlog 
            WHERE subjectId = ? AND qset = ? AND expertId = ?
            ORDER BY loggedin DESC
            LIMIT 1
        `;
        const [results] = await connection.query(query, [subjectId, qset, expertId]);

        if (results.length > 0) {
            console.log("Assigned student_id:", results[0].student_id);
            res.status(200).json(results[0]);
        } else {
            res.status(404).json({ error: 'No assigned passages found' });
        }
    } catch (err) {
        console.error("Error fetching assigned passages:", err);
        res.status(500).json({ error: 'Error fetching assigned passages' });
    }
};

exports.assignStudentForQSet = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset } = req.params;
    const expertId = req.session.expertId;

    let conn;
    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        // Check if the expert already has an active assignment
        const checkExistingAssignmentQuery = `
            SELECT student_id, loggedin, status, subm_done, subm_time, QPA, QPB
            FROM modreviewlog 
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND (subm_done IS NULL OR subm_done = 0)
            LIMIT 1
        `;
        const [existingAssignment] = await conn.query(checkExistingAssignmentQuery, [subjectId, qset, expertId]);

        let student_id, loggedin, status, subm_done, subm_time, QPA, QPB;

        if (existingAssignment.length > 0) {
            // Expert has an existing active assignment
            ({ student_id, loggedin, status, subm_done, subm_time, QPA, QPB } = existingAssignment[0]);

            // Update the existing assignment
            const updateAssignmentQuery = `
                UPDATE modreviewlog 
                SET loggedin = NOW(), status = 1, subm_done = 0, subm_time = NULL
                WHERE student_id = ? AND subjectId = ? AND qset = ? AND expertId = ?
            `;
            await conn.query(updateAssignmentQuery, [student_id, subjectId, qset, expertId]);
            loggedin = new Date();
            status = 1;
            subm_done = 0;
            subm_time = null;
        } else {
            // Assign a new student that is not already assigned to any expert
            const assignNewStudentQuery = `
                UPDATE modreviewlog 
                SET expertId = ?, loggedin = NOW(), status = 1, subm_done = 0, subm_time = NULL
                WHERE subjectId = ? AND qset = ? AND expertId IS NULL AND student_id IS NOT NULL
                LIMIT 1
            `;
            const [assignResult] = await conn.query(assignNewStudentQuery, [expertId, subjectId, qset]);

            if (assignResult.affectedRows > 0) {
                // Fetch the new assignment details
                const [newAssignment] = await conn.query(checkExistingAssignmentQuery, [subjectId, qset, expertId]);
                ({ student_id, loggedin, status, subm_done, subm_time, QPA, QPB } = newAssignment[0]);
            } else {
                // No available students
                await conn.rollback();
                return res.status(400).json({ error: 'No available students for this QSet. All students are already assigned.' });
            }
        }

        // Check if QPA and QPB are already filled
        if (!QPA || !QPB) {
            // Fetch ignore lists only if QPA or QPB is not filled
            const fetchIgnoreListsQuery = `
                SELECT Q${qset}PA as QPA, Q${qset}PB as QPB
                FROM qsetdb
                WHERE subject_id = ?
            `;
            const [ignoreListsResult] = await conn.query(fetchIgnoreListsQuery, [subjectId]);

            if (ignoreListsResult.length === 0) {
                await conn.rollback();
                return res.status(404).json({ error: 'Ignore lists not found for this subject and qset' });
            }

            QPA = QPA || ignoreListsResult[0].QPA;
            QPB = QPB || ignoreListsResult[0].QPB;

            // Update the modreviewlog with the ignore lists only if they were not filled
            const updateIgnoreListsQuery = `
                UPDATE modreviewlog
                SET QPA = COALESCE(QPA, ?), QPB = COALESCE(QPB, ?)
                WHERE student_id = ? AND subjectId = ? AND qset = ? AND expertId = ?
            `;
            await conn.query(updateIgnoreListsQuery, [QPA, QPB, student_id, subjectId, qset, expertId]);
        }

        await conn.commit();
        res.status(200).json({ qset, student_id, loggedin, status, subm_done, subm_time, QPA, QPB });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error assigning student for QSet:", err);
        res.status(500).json({ error: 'Error assigning student for QSet' });
    } finally {
        if (conn) conn.release();
    }
};

exports.getStudentPassages = async (req, res) => {
    console.log("getStudentPassages called with params:", req.params);
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, studentId } = req.params;

    try {
        const query = `
            SELECT passageA, passageB, ansPassageA, ansPassageB, student_id
            FROM expertreviewlog 
            WHERE subjectId = ? AND qset = ? AND student_id = ?
            LIMIT 1
        `;
        const [results] = await connection.query(query, [subjectId, qset, studentId]);

        if (results.length > 0) {
            console.log("Fetched student_id:", results[0].student_id);
            res.status(200).json(results[0]);
        } else {
            res.status(404).json({ error: 'No passages found for this student' });
        }
    } catch (err) {
        console.error("Error fetching student passages:", err);
        res.status(500).json({ error: 'Error fetching student passages' });
    }
};

exports.getPassagesByStudentId = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { studentId } = req.body;  // Changed from req.params to req.body

    try {
        const query = `
            SELECT passageA, passageB, ansPassageA, ansPassageB, student_id, subjectId, qset
            FROM expertreviewlog 
            WHERE student_id = ?
        `;
        const [results] = await connection.query(query, [studentId]);

        if (results.length > 0) {
            console.log("Assigned student_id:", results[0].student_id);
            res.status(200).json(results[0]);
        } else {
            res.status(404).json({ error: 'No assigned passages found' });
        }
    } catch (err) {
        console.error("Error fetching assigned passages:", err);
        res.status(500).json({ error: 'Error fetching assigned passages' });
    }
};

// Ignore list management routes
// 1. Get ignorelist functions
exports.getIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
        
        const query = `
            SELECT ${columnName} AS ignoreList, student_id
            FROM modreviewlog
            WHERE subjectId = ? AND qset = ? AND expertId = ?
            ORDER BY loggedin DESC
            LIMIT 1
        `;
        
        const [results] = await connection.query(query, [subjectId, qset, expertId]);

        if (results.length > 0) {
            const { ignoreList, student_id } = results[0];
            
            if (ignoreList) {
                // Split the ignore list string into an array
                const ignoreListArray = ignoreList.split(',').map(item => item.trim());
                
                console.log(`Fetched ignore list for expertId: ${expertId}, student_id: ${student_id}, subjectId: ${subjectId}, qset: ${qset}, activePassage: ${activePassage}`);
                console.log(`Table: modreviewlog, Column: ${columnName}`);
                console.log(`Ignore list: ${ignoreListArray.join(', ')}`);
                
                res.status(200).json({ 
                    ignoreList: ignoreListArray,
                    debug: {
                        expertId,
                        student_id,
                        subjectId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            } else {
                console.log(`No ignore list found for expertId: ${expertId}, student_id: ${student_id}, subjectId: ${subjectId}, qset: ${qset}, activePassage: ${activePassage}`);
                console.log(`Table: modreviewlog, Column: ${columnName}`);
                res.status(404).json({ 
                    error: 'No ignore list found',
                    debug: {
                        expertId,
                        student_id,
                        subjectId,
                        qset,
                        activePassage,
                        table: 'modreviewlog',
                        column: columnName
                    }
                });
            }
        } else {
            console.log(`No record found for expertId: ${expertId}, subjectId: ${subjectId}, qset: ${qset}`);
            console.log(`Table: modreviewlog, Column: ${columnName}`);
            res.status(404).json({ 
                error: 'No record found',
                debug: {
                    expertId,
                    subjectId,
                    qset,
                    activePassage,
                    table: 'modreviewlog',
                    column: columnName
                }
            });
        }
    } catch (err) {
        console.error("Error fetching ignore list:", err);
        res.status(500).json({ error: 'Error fetching ignore list' });
    }
};

exports.getStudentIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage } = req.body;
    // const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('this fetched')

    try {
        const columnName = `Q${qset}P${activePassage}`;
        
        const query = `
            SELECT ${columnName} AS ignoreList
            FROM qsetdb
            WHERE subject_id = ?
        `;
        
        const [results] = await connection.query(query, [subjectId]);

        if (results.length > 0 && results[0].ignoreList) {
            // Split the ignore list string into an array
            const ignoreList = results[0].ignoreList.split(',').map(item => item.trim());
            console.log(ignoreList)
            res.status(200).json({ ignoreList });
        } else {
            res.status(404).json({ error: 'No ignore list found' });
        }
    } catch (err) {
        console.error("Error fetching ignore list:", err);
        res.status(500).json({ error: 'Error fetching ignore list' });
    }
};

// 2. Get addToIgnoreList functions
exports.addToIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, newWord } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !newWord) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    let conn;
    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
        
        // First, fetch the current ignore list
        const selectQuery = `
            SELECT ${columnName} AS ignoreList, student_id
            FROM modreviewlog
            WHERE subjectId = ? AND qset = ? AND expertId = ?
            ORDER BY loggedin DESC
            LIMIT 1
            FOR UPDATE
        `;
        
        const [results] = await conn.query(selectQuery, [subjectId, qset, expertId]);

        let currentIgnoreList = [];
        let student_id = null;
        if (results.length > 0) {
            if (results[0].ignoreList) {
                currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
            }
            student_id = results[0].student_id;
        }

        // Add the new word if it's not already in the list
        if (!currentIgnoreList.includes(newWord)) {
            currentIgnoreList.unshift(newWord);
            console.log(`Word added: ${newWord}`);
            console.log(`Table updated: modreviewlog`);
            console.log(`Column updated: ${columnName}`);
        } else {
            console.log(`Word "${newWord}" already exists in the ignore list. No changes made.`);
        }

        // Join the list back into a comma-separated string
        const updatedIgnoreList = currentIgnoreList.join(', ');

        // Update the database with the new ignore list
        const updateQuery = `
            UPDATE modreviewlog
            SET ${columnName} = ?
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND student_id = ?
        `;

        await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, expertId, student_id]);
        
        await conn.commit();

        res.status(200).json({ 
            message: 'Word added to ignore list', 
            ignoreList: currentIgnoreList,
            debug: {
                expertId,
                student_id,
                subjectId,
                qset,
                activePassage,
                table: 'modreviewlog',
                column: columnName
            }
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error adding word to ignore list:", err);
        res.status(500).json({ error: 'Error adding word to ignore list' });
    } finally {
        if (conn) conn.release();
    }
};

exports.addToStudentIgnoreList = async (req, res) => {
    console.log("Received data:", req.body);
    const { activePassage, newWord, subjectId, qset } = req.body;

    // Input validation
    if (!subjectId || !qset || !activePassage || !newWord) {
        console.log("Missing parameters:", { subjectId, qset, activePassage, newWord });
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    let conn;
    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        const columnName = `Q${qset}P${activePassage}`;
        
        // First, fetch the current ignore list
        const selectQuery = `
            SELECT ${columnName} AS ignoreList
            FROM qsetdb
            WHERE subject_id = ?
            FOR UPDATE
        `;
        
        const [results] = await conn.query(selectQuery, [subjectId]);

        let currentIgnoreList = [];
        if (results.length > 0 && results[0].ignoreList) {
          currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
        }

        // Add the new word if it's not already in the list
        if (!currentIgnoreList.includes(newWord)) {
            currentIgnoreList.unshift(newWord);
          }

        // Join the list back into a comma-separated string
        const updatedIgnoreList = currentIgnoreList.join(', ');

        // Update the database with the new ignore list
        const updateQuery = `
            UPDATE qsetdb
            SET ${columnName} = ?
            WHERE subject_id = ?
        `;

        await conn.query(updateQuery, [updatedIgnoreList, subjectId]);
        
        await conn.commit();
        console.log(currentIgnoreList);

        res.status(200).json({ message: 'Word added to ignore list', ignoreList: currentIgnoreList });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error adding word to ignore list:", err);
        res.status(500).json({ error: 'Error adding word to ignore list' });
    } finally {
        if (conn) conn.release();
    }
};

// 2. Get addToIgnoreList functions
exports.removeFromIgnoreList = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, wordToRemove } = req.body;
    const expertId = req.session.expertId;

    // Input validation
    if (!subjectId || !qset || !activePassage || !wordToRemove) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    let conn;
    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        const columnName = activePassage === 'A' ? 'QPA' : 'QPB';
        
        // First, fetch the current ignore list
        const selectQuery = `
            SELECT ${columnName} AS ignoreList, student_id
            FROM modreviewlog
            WHERE subjectId = ? AND qset = ? AND expertId = ?
            ORDER BY loggedin DESC
            LIMIT 1
            FOR UPDATE
        `;
        
        const [results] = await conn.query(selectQuery, [subjectId, qset, expertId]);

        if (results.length === 0 || !results[0].ignoreList) {
            await conn.rollback();
            return res.status(404).json({ error: 'No ignore list found' });
        }

        let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
        const student_id = results[0].student_id;

        // Remove the word from the list
        const initialLength = currentIgnoreList.length;
        currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());

        if (currentIgnoreList.length < initialLength) {
            console.log(`Word removed: ${wordToRemove}`);
            console.log(`Table updated: modreviewlog`);
            console.log(`Column updated: ${columnName}`);
        } else {
            console.log(`Word "${wordToRemove}" not found in the ignore list. No changes made.`);
        }

        // Join the list back into a comma-separated string
        const updatedIgnoreList = currentIgnoreList.join(', ');

        // Update the database with the new ignore list
        const updateQuery = `
            UPDATE modreviewlog
            SET ${columnName} = ?
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND student_id = ?
        `;

        await conn.query(updateQuery, [updatedIgnoreList, subjectId, qset, expertId, student_id]);
        
        await conn.commit();

        res.status(200).json({ 
            message: 'Word removed from ignore list', 
            ignoreList: currentIgnoreList,
            debug: {
                expertId,
                student_id,
                subjectId,
                qset,
                activePassage,
                table: 'modreviewlog',
                column: columnName
            }
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error removing word from ignore list:", err);
        res.status(500).json({ error: 'Error removing word from ignore list' });
    } finally {
        if (conn) conn.release();
    }
};

exports.removeFromStudentIgnoreList = async (req, res) => {
    const { subjectId, qset, activePassage, wordToRemove } = req.body;

    // Input validation
    if (!subjectId || !qset || !activePassage || !wordToRemove) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    let conn;
    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        const columnName = `Q${qset}P${activePassage}`;
        
        // First, fetch the current ignore list
        const selectQuery = `
            SELECT ${columnName} AS ignoreList
            FROM qsetdb 
            WHERE subject_id = ?
            FOR UPDATE
        `;
        
        const [results] = await conn.query(selectQuery, [subjectId]);

        if (results.length === 0 || !results[0].ignoreList) {
            await conn.rollback();
            return res.status(404).json({ error: 'No ignore list found' });
        }

        let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());

        // Remove the word from the list
        currentIgnoreList = currentIgnoreList.filter(word => word.toLowerCase() !== wordToRemove.toLowerCase());

        // Join the list back into a comma-separated string
        const updatedIgnoreList = currentIgnoreList.join(', ');

        // Update the database with the new ignore list
        const updateQuery = `
            UPDATE qsetdb
            SET ${columnName} = ?
            WHERE subject_id = ?
        `;

        await conn.query(updateQuery, [updatedIgnoreList, subjectId]);
        
        await conn.commit();

        res.status(200).json({ message: 'Word removed from ignore list', ignoreList: currentIgnoreList });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error removing word from ignore list:", err);
        res.status(500).json({ error: 'Error removing word from ignore list' });
    } finally {
        if (conn) conn.release();
    }
};

// Functions to check the expert logged in status


// Passage review submission function
exports.submitPassageReview = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset } = req.params;
    const expertId = req.session.expertId;

    let conn;
    try {
        conn = await connection.getConnection();
        await conn.beginTransaction();

        // First, fetch the current assignment for this expert
        const fetchAssignmentQuery = `
            SELECT student_id
            FROM modreviewlog
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND status = 1 AND subm_done = 0
            ORDER BY loggedin DESC
            LIMIT 1
        `;
        const [assignmentResult] = await conn.query(fetchAssignmentQuery, [subjectId, qset, expertId]);

        if (assignmentResult.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'No active assignment found for this expert' });
        }

        const studentId = assignmentResult[0].student_id;

        // Update the modreviewlog table for the specific student
        const updateQuery = `
            UPDATE modreviewlog 
            SET subm_done = 1, subm_time = NOW()
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND student_id = ? AND status = 1
        `;
        const [updateResult] = await conn.query(updateQuery, [subjectId, qset, expertId, studentId]);

        if (updateResult.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'No matching record found to update' });
        }

        // Fetch the updated record
        const selectQuery = `
            SELECT student_id, subm_done, subm_time
            FROM modreviewlog
            WHERE subjectId = ? AND qset = ? AND expertId = ? AND student_id = ?
        `;
        const [results] = await conn.query(selectQuery, [subjectId, qset, expertId, studentId]);

        if (results.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Updated record not found' });
        }

        await conn.commit();
        res.status(200).json(results[0]);
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error submitting passage review:", err);
        res.status(500).json({ error: 'Error submitting passage review' });
    } finally {
        if (conn) conn.release();
    }
};


