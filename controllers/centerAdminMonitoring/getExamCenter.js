const connection = require('../../config/db1');

exports.getExamCenter = async (req, res) => {
    

    const query = 'SELECT center, centerpass FROM examcenterdb';
    try{
        const [results] = await connection.query(query);
        
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
}