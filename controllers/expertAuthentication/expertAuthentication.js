// expertAuthentication.js
const connection = require('../../config/db1');

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
        SELECT e.subjectId, s.subject_name, COUNT(DISTINCT e.student_id) as student_count
        FROM expertreviewlog e
        JOIN subjectsdb s ON e.subjectId = s.subjectId
        WHERE e.student_id IS NOT NULL
        GROUP BY e.subjectId, s.subject_name
        ORDER BY e.subjectId
    `;

    try {
        const [results] = await connection.query(subjectsQuery);
        
        // Console log the subjects and their student counts
        console.log("Subjects available for expert with student counts:");
        results.forEach(subject => {
            console.log(`Subject ID: ${subject.subjectId}, Name: ${subject.subject_name}, Student Count: ${subject.student_count}`);
        });

        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching subjects:", err);
        res.status(500).json({ error: 'Error fetching subjects' });
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

        // Check if the expert already has an assigned student for this subject and qset
        const checkAssignmentQuery = `
            SELECT student_id, loggedin, status, subm_done, subm_time
            FROM expertreviewlog 
            WHERE subjectId = ? AND qset = ? AND expertId = ? 
            LIMIT 1
        `;
        const [assignmentResult] = await conn.query(checkAssignmentQuery, [subjectId, qset, expertId]);

        let student_id, loggedin, status, subm_done, subm_time;

        if (assignmentResult.length > 0 && assignmentResult[0].subm_done !== 1) {
            // Expert already has an unsubmitted assignment, use the existing one
            student_id = assignmentResult[0].student_id;
            loggedin = assignmentResult[0].loggedin;
            status = assignmentResult[0].status;
            subm_done = assignmentResult[0].subm_done;
            subm_time = assignmentResult[0].subm_time;

            // Update login status if not already logged in
            if (!status) {
                const updateLoginQuery = `
                    UPDATE expertreviewlog 
                    SET loggedin = NOW(), status = 1
                    WHERE student_id = ? AND subjectId = ? AND qset = ? AND expertId = ?
                `;
                await conn.query(updateLoginQuery, [student_id, subjectId, qset, expertId]);
                loggedin = new Date();
                status = 1;
            }
        } else {
            // Try to assign a new student
            const assignStudentQuery = `
                UPDATE expertreviewlog 
                SET expertId = ?, loggedin = NOW(), status = 1, subm_done = 0, subm_time = NULL
                WHERE subjectId = ? AND qset = ? AND expertId IS NULL 
                LIMIT 1
            `;
            const [assignResult] = await conn.query(assignStudentQuery, [expertId, subjectId, qset]);

            if (assignResult.affectedRows > 0) {
                // Fetch the student_id that was just assigned
                const [newAssignment] = await conn.query(checkAssignmentQuery, [subjectId, qset, expertId]);
                student_id = newAssignment[0].student_id;
                loggedin = newAssignment[0].loggedin;
                status = newAssignment[0].status;
                subm_done = newAssignment[0].subm_done;
                subm_time = newAssignment[0].subm_time;
            } else {
                // No available students
                await conn.rollback();
                return res.status(400).json({ error: 'No available students for this QSet. All students are already assigned to other experts.' });
            }
        }

        await conn.commit();
        res.status(200).json({ qset, student_id, loggedin, status, subm_done, subm_time });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Error assigning student for QSet:", err);
        res.status(500).json({ error: 'Error assigning student for QSet' });
    } finally {
        if (conn) conn.release();
    }
};

exports.getQSetsForSubject = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId } = req.params;

    try {
        const qsetQuery = `
            SELECT qset, COUNT(DISTINCT student_id) as student_count
            FROM expertreviewlog 
            WHERE subjectId = ?
            GROUP BY qset
            HAVING student_count > 0
            ORDER BY qset
        `;
        const [qsetResults] = await connection.query(qsetQuery, [subjectId]);

        console.log(`QSets for subject ${subjectId} with student counts:`);
        qsetResults.forEach(qset => {
            console.log(`QSet: ${qset.qset}, Student Count: ${qset.student_count}`);
        });

        // const availableQSets = qsetResults.map(qsetObj => qsetObj.qset);

        res.status(200).json(qsetResults);
    } catch (err) {
        console.error("Error fetching qsets:", err);
        res.status(500).json({ error: 'Error fetching qsets' });
    }
};

exports.getExpertAssignedPassages = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset } = req.params;
    const expertId = req.session.expertId;

    try {
        const query = `
            SELECT passageA, passageB, ansPassageA, ansPassageB, student_id
            FROM expertreviewlog 
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

exports.getIgnoreList = async (req, res) => {
    // Uncomment if authentication is required
    // if (!req.session.expertId) {
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    const { subjectId, qset, activePassage } = req.body;

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

exports.addToIgnoreList = async (req, res) => {
    // Uncomment if authentication is required
    // if (!req.session.expertId) {
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    const { subjectId, qset, activePassage, newWord } = req.body;

    // Input validation
    if (!subjectId || !qset || !activePassage || !newWord) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const columnName = `Q${qset}P${activePassage}`;
        
        // First, fetch the current ignore list
        const selectQuery = `
            SELECT ${columnName} AS ignoreList
            FROM qsetdb
            WHERE subject_id = ?
        `;
        
        const [results] = await connection.query(selectQuery, [subjectId]);

        let currentIgnoreList = [];
        if (results.length > 0 && results[0].ignoreList) {
            currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());
        }

        // Add the new word if it's not already in the list
        if (!currentIgnoreList.includes(newWord)) {
            currentIgnoreList.push(newWord);
        }

        // Join the list back into a comma-separated string
        const updatedIgnoreList = currentIgnoreList.join(', ');

        // Update the database with the new ignore list
        const updateQuery = `
            UPDATE qsetdb
            SET ${columnName} = ?
            WHERE subject_id = ?
        `;

        await connection.query(updateQuery, [updatedIgnoreList, subjectId]);
        console.log(currentIgnoreList)

        res.status(200).json({ message: 'Word added to ignore list', ignoreList: currentIgnoreList });
    } catch (err) {
        console.error("Error adding word to ignore list:", err);
        res.status(500).json({ error: 'Error adding word to ignore list' });
    }
};

exports.removeFromIgnoreList = async (req, res) => {
    // Uncomment if authentication is required
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subjectId, qset, activePassage, wordToRemove } = req.body;

    // Input validation
    if (!subjectId || !qset || !activePassage || !wordToRemove) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const columnName = `Q${qset}P${activePassage}`;
        
        // First, fetch the current ignore list
        const selectQuery = `
            SELECT ${columnName} AS ignoreList
            FROM qsetdb 
            WHERE subject_id = ?
        `;
        
        const [results] = await connection.query(selectQuery, [subjectId]);

        if (results.length === 0 || !results[0].ignoreList) {
            return res.status(404).json({ error: 'No ignore list found' });
        }

        let currentIgnoreList = results[0].ignoreList.split(',').map(item => item.trim());

        // Remove the word from the list
        currentIgnoreList = currentIgnoreList.filter(word => word !== wordToRemove);

        // Join the list back into a comma-separated string
        const updatedIgnoreList = currentIgnoreList.join(', ');

        // Update the database with the new ignore list
        const updateQuery = `
            UPDATE qsetdb
            SET ${columnName} = ?
            WHERE subject_id = ?
        `;

        await connection.query(updateQuery, [updatedIgnoreList, subjectId]);
        console.log(currentIgnoreList)

        res.status(200).json({ message: 'Word removed from ignore list', ignoreList: currentIgnoreList });
    } catch (err) {
        console.error("Error removing word from ignore list:", err);
        res.status(500).json({ error: 'Error removing word from ignore list' });
    }
};

exports.getStudentPassages = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({error: 'Unauthorized'});
    }
    const { studentId } = req.body;

    try{
        const query = `
        SELECT subjectId, qset
        FROM expertreviewlog
        WHERE student_id = ?
        LIMIT 1
        `;
        const [results] = await connection.query(query, [studentId]);

        if (results.length > 0) {
            res.status(200).json(results[0]);
        } else {
            res.status(404).json({ error: 'No matching record found' });
        }
    } catch (err) {
        console.error("Error fetching student details:", err);
        res.status(500).json({ error: 'Error fetching student details' });
    }
}

// Functions to check the expert logged in status
exports.logoutExpert = async (req, res) => {
    if (!req.session.expertId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const expertId = req.session.expertId;

    let conn;
    try {
        conn = await connection.getConnection();

        const updateStatusQuery = `
            UPDATE expertreviewlog 
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

// Function to handle the expert submission
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

        // Update the expertreviewlog table
        const updateQuery = `
            UPDATE expertreviewlog 
            SET subm_done = 1, subm_time = NOW()
            WHERE subjectId = ? AND qset = ? AND expertId = ?
        `;
        await conn.query(updateQuery, [subjectId, qset, expertId]);

        // Fetch the updated record
        const selectQuery = `
            SELECT student_id, subm_done, subm_time
            FROM expertreviewlog
            WHERE subjectId = ? AND qset = ? AND expertId = ?
        `;
        const [results] = await conn.query(selectQuery, [subjectId, qset, expertId]);

        if (results.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'No matching record found' });
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


// exports.getExpertAssignments = async (req, res) => {
//     console.log("Before fetching")
//     const { expertId } = req.session; // Use expertId from the session

//     if (!expertId) {
//         res.status(401).send('Unauthorized');
//         return;
//     }

//     const sql = `SELECT student_id FROM finalpassagesubmit WHERE expertId = ?`;
//     try {
//         const [results] = await connection.query(sql, [expertId]); // Use expertId to fetch student IDs
//         if (results.length > 0) {
//             res.status(200).json(results); // Send the array of results

//             // Log all student_id values
//             results.forEach((result, index) => {
//                 console.log(`Student ${index + 1}: ${result.student_id}`);
//             });

//         } else {
//             res.status(404).json({ error: 'No students found for this expert' });
//         }
//     } catch (err) {
//         console.error('Error fetching student details:', err);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

// exports.getStudentPassages = async (req, res) => {
//     const { expertId } = req.session;
//     const { studentId } = req.params;

//     if (!expertId) {
//         res.status(401).send('Unauthorized');
//         return;
//     }

//     const sql = `SELECT passageA, passageB, ansPassageA, ansPassageB FROM finalpassagesubmit WHERE expertId = ? AND student_id = ?`;

//     try {
//         const [results] = await connection.query(sql, [expertId, studentId]);
//         if (results.length > 0) {
//             res.status(200).json(results[0]);
//         } else {
//             res.status(404).json({ error: 'No passages found for this student' });
//         }
//     } catch (err) {
//         console.error('Error fetching passages:', err);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };



