const connection = require('../../config/db1');
exports.getAudioLogs = async (req, res) => {
    const studentId = req.params.studentId;
    const studentBody = req.body;

    const query = 'SELECT * FROM audiologs WHERE student_id = ?';

    console.log("studentId: "+studentId);
    try{
        const [results] = await connection.query(query, [studentId]);
        
        console.log("result: "+results);
        if (results.length > 0) {
            results.forEach(entry => {
                console.log("entry:", JSON.stringify(entry, null, 2));
            });
            res.status(200).json(results);
            
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
    return;
}