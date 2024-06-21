exports.updatePassageFinalLogs = async (req, res) => {
    const studentId = req.session.studentId;
    const { question1, question2, question3 } = req.body;

    console.log('Received request:', req.body);
    console.log('Student ID from session:', studentId);

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    const findLogQuery = `SELECT * FROM finalPassageSubmit WHERE student_id = ?`;
    const updateLogQuery = `UPDATE finalPassageSubmit SET question1 = ?, question2 = ?, question3 = ? WHERE student_id = ?`;
    const insertLogQuery = `INSERT INTO finalPassageSubmit (student_id, question1, question2, question3) VALUES (?, ?, ?, ?)`;

    try {
        const [rows] = await connection.query(findLogQuery, [studentId]);

        if (rows.length > 0) {
            console.log('Existing log found, updating:', updateLogQuery, [question1, question2, question3, studentId]);
            await connection.query(updateLogQuery, [question1, question2, question3, studentId]);
        } else {
            console.log('No log found, inserting new:', insertLogQuery, [studentId, question1, question2, question3]);
            await connection.query(insertLogQuery, [studentId, question1, question2, question3]);
        }

        const responseData = {
            student_id: studentId,
            question1: question1,
            question2: question2,
            question3: question3
        };
        console.log('Questions updated:', responseData);

        res.send(responseData);
    } catch (err) {
        console.error('Failed to update passage final logs:', err);
        res.status(500).send(err.message);
    }
};