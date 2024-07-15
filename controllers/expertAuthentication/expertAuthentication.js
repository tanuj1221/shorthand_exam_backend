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

    exports.getQSetsForSubject = async (req, res) => {
        if (!req.session.expertId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    
        const { subjectId } = req.params;
        const qsetQuery = 'SELECT DISTINCT qset FROM expertreviewlog WHERE subjectId = ?';
    
        try {
            const [results] = await connection.query(qsetQuery, [subjectId]);
            res.status(200).json(results);
        } catch (err) {
            console.error("Error fetching qsets:", err);
            res.status(500).json({ error: 'Error fetching qsets' });
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
    


