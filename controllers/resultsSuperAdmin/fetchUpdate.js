const connection = require('../../config/db1');
const StudentTableDTO = require('../../dto/studentTableDTO');
const encryptionInterface = require('../../config/encrypt');

exports.fetchUpdateTable = async (req, res) => {
    const { student_id, subjectId, center, batchNo, tableName } = req.body;

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
    }else if(tableName === "audiologs"){
        if(student_id){
            studentQuery += ' WHERE student_id = ?';
            queryParam.push(student_id);
        }
    }else if(tableName === "studentlogs"){
        
        if(student_id && center){
            studentQuery += ' WHERE student_id = ? AND center = ?';
            queryParam.push(student_id, center);
        }else if(student_id){
            studentQuery += ' WHERE student_id = ?';
            queryParam.push(student_id);
        }else if(center){
            studentQuery += ' WHERE center = ?';
            queryParam.push(center);
        }
    }else if(tableName === 'textlogs'){
        if(student_id){
            studentQuery += ' WHERE student_id = ?';
            queryParam.push(student_id);
        }
    }else if(tableName === 'loginlogs'){
        if(student_id){
            studentQuery += ' WHERE student_id = ?';
            queryParam.push(student_id);
        }
    }else if(tableName === 'batchdb'){
        if(batchNo){
            studentQuery += ' WHERE batchNo = ?';
            queryParam.push(batchNo);
        }
    }else if(tableName === 'controllerdb'){
        if(center && batchNo){
            studentQuery += ' WHERE center = ? AND batchNo = ?';
            queryParam.push(center, batchNo);
        }else if(center){
            studentQuery += ' WHERE center = ?';
            queryParam.push(center);
        }else if(batchNo){
            studentQuery += ' WHERE batchNo = ?';
            queryParam.push(batchNo);
        }
    }else if(tableName === 'examcenterdb'){
        
        if(center){
            studentQuery += ' WHERE center = ?';
            queryParam.push(center);
        }
    }else if(tableName === 'feedbackdb'){
        if(student_id){
            studentQuery += ' WHERE student_id = ?';
            queryParam.push(student_id);
        }
    }else if(tableName === 'finalpassagesubmit'){
        if(student_id){
            studentQuery += ' WHERE student_id = ?';
            queryParam.push(student_id);
        }
    }else if(tableName === 'pcregistration'){
        if(center){
            studentQuery += ' WHERE center = ?';
            queryParam.push(center);
        }
    }else if(tableName === 'subjectdb'){
        if(subjectId){
            studentQuery += ' WHERE subjectId = ?';
            queryParam.push(subjectId);
        }
    }

    try {
        console.log("query: " + studentQuery);
        console.log("query parameters: ", queryParam);
        const [results] = await connection.query(studentQuery, queryParam);
        
        //console.log(results);
        if (results.length > 0) {
            const filteredResults = results.map(result => {
                const { base64, ...filteredResult } = result;
                return filteredResult;
            });
            res.status(200).json(filteredResults);
            //console.log(filteredResults);
        } else {
            res.status(404).send('No records found!');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};
