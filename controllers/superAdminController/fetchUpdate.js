const connection = require('../../config/db1');
const StudentTableDTO = require('../../dto/studentTableDTO');
const encryptionInterface = require('../../config/encrypt');

exports.fetchUpdateTable = async (req, res) => {
    const { center, batchNo, tableName } = req.body;

    let studentQuery = `SELECT * FROM ??`;  // Using ?? for table name
    let queryParam = [tableName];

    if(tableName === "students"){
        if (center && batchNo) {
            studentQuery += ' WHERE center = ? AND batchNo = ?';
            queryParam.push(center, batchNo);
        } else if (center && !batchNo) {
            studentQuery += ' WHERE center = ?';
            queryParam.push(center);
        } else if (!center && batchNo) {
            studentQuery += ' WHERE batchNo = ?';
            queryParam.push(batchNo);
        }
    } 

    try {
        console.log("query: " + studentQuery);
        console.log("query parameters: ", queryParam);
        const [results] = await connection.query(studentQuery, queryParam);
        
        console.log(results);
        if (results.length > 0) {
            const filteredResults = results.map(result => {
                const { base64, ...filteredResult } = result;
                return filteredResult;
            });
            res.status(200).json(filteredResults);
        } else {
            res.status(404).send('No records found!');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};
