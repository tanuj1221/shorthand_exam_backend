const connection = require('../../config/db1');
const StudentTableDTO = require('../../dto/studentTableDTO');
const encryptionInterface = require('../../config/encrypt');

exports.fetchUpdateTable = async (req, res) => {
    
    const { student_id, expertId, status, subm_done, qset, subjectId, subject_id, tableName } = req.body;

    let fetchQuery = `SELECT * FROM ??`;  // Using ?? for table name
    let queryParam = [tableName];

    if(tableName === "expertreviewlogs"){
        if (student_id) {
            fetchQuery += ' WHERE student_id = ?';
            queryParam.push(student_id);
        } else if (expertId) {
            fetchQuery += ' WHERE center = ?';
            queryParam.push(expertId);
        } else if (subm_done) {
            fetchQuery += ' WHERE expertId = ?';
            queryParam.push(subm_done);
        }else if (qset) {
            fetchQuery += ' WHERE qset = ?';
            queryParam.push(qset);
        }else if (status) {
            fetchQuery += ' WHERE status = ?';
            queryParam.push(status);
        }
    }else if(tableName === "qsetdb"){
        
        if(subject_id){
            fetchQuery += ' WHERE subject_id = ?';
            queryParam.push(subject_id);
        }
    }

    try {
        console.log("query: " + fetchQuery);
        console.log("query parameters: ", queryParam);
        const [results] = await connection.query(fetchQuery, queryParam);
        
        //console.log(results);
        if (results.length > 0) {
            
            res.status(200).json(results);
            //console.log(filteredResults);
        } else {
            res.status(404).send('No records found!');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};
