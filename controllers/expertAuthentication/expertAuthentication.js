    const connection = require('../../config/db1');

    exports.loginExpertAdmin = async (req, res) => {
        console.log("Trying expert admin login");
        const { expertId, password } = req.body;
        console.log("expertId: "+ expertId + " password: "+ password);
        const expertQuery = 'SELECT * FROM expertdb WHERE expertId = ?';
    
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
                    
                    // Fetch and log subjects
                    const subjectsQuery = 'SELECT * FROM subjectsdb';
                    const [subjectsResults] = await connection.query(subjectsQuery);
                    console.log("Subjects available for expert:");
                    console.log(subjectsResults);
                    
                    res.status(200).json({
                        message: 'Logged in successfully as an expert!'
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
    
        const subjectsQuery = 'SELECT * FROM subjectsdb';
    
        try {
            const [results] = await connection.query(subjectsQuery);
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
                SELECT student_id 
                FROM expertreviewlog 
                WHERE subjectId = ? AND qset = ? AND expertId = ? 
                LIMIT 1
            `;
            const [assignmentResult] = await conn.query(checkAssignmentQuery, [subjectId, qset, expertId]);
    
            let student_id;
    
            if (assignmentResult.length > 0) {
                // Expert already has an assignment, use the existing one
                student_id = assignmentResult[0].student_id;
            } else {
                // Try to assign a new student
                const assignStudentQuery = `
                    UPDATE expertreviewlog 
                    SET expertId = ? 
                    WHERE subjectId = ? AND qset = ? AND expertId IS NULL 
                    LIMIT 1
                `;
                const [assignResult] = await conn.query(assignStudentQuery, [expertId, subjectId, qset]);
    
                if (assignResult.affectedRows > 0) {
                    // Fetch the student_id that was just assigned
                    const [newAssignment] = await conn.query(checkAssignmentQuery, [subjectId, qset, expertId]);
                    student_id = newAssignment[0].student_id;
                } else {
                    throw new Error('No available students for this QSet');
                }
            }
    
            await conn.commit();
            res.status(200).json({ qset, student_id });
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
        const expertId = req.session.expertId;
    
        try {
            // Get the QSets for the subject
            const qsetQuery = 'SELECT DISTINCT qset FROM expertreviewlog WHERE subjectId = ?';
            const [qsetResults] = await connection.query(qsetQuery, [subjectId]);
    
            const availableQSets = qsetResults.map(qsetObj => qsetObj.qset);
    
            res.status(200).json(availableQSets);
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
                LIMIT 1
            `;
            const [results] = await connection.query(query, [subjectId, qset, expertId]);
    
            if (results.length > 0) {
                res.status(200).json(results[0]);
            } else {
                res.status(404).json({ error: 'No assigned passages found' });
            }
        } catch (err) {
            console.error("Error fetching assigned passages:", err);
            res.status(500).json({ error: 'Error fetching assigned passages' });
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
    


