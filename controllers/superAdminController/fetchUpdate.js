const connection = require('../../config/db1');
const StudentTableDTO = require('../../dto/studentTableDTO');
const encryptionInterface = require('../../config/encrypt');

exports.fetchUpdateTable = async (req, res) => {
    
    const { center, batchNo, tableName } = req.body;

    let studentQuery = 'select * from students';
    let queryParam = [];
    
    if (center && batchNo) {
        //query = queryExamCenterCodeBatchNo;
        studentQuery += ' WHERE students.center = ? AND students.batchNo = ?;'
        queryParam.push(center, batchNo);
    } else if (center && !batchNo) {
        //query = queryExamCenterCode;
        studentQuery += ' WHERE students.center = ?;'
        queryParam.push(center);
    } else if (!center && batchNo) {
        //query = queryBatchNo;
        studentQuery += ' WHERE students.batchNo = ?;'
        queryParam.push(batchNo);
    }

    try{
        console.log("query: "+studentQuery);
        const [results] = await connection.query(studentQuery, queryParam);
        
        if (results.length > 0) {
            const studentTableDTOs = results.map(result => {
                const student = new StudentTableDTO(
                    result.student_id,
                    result.instituteId,
                    result.batchNo,
                    result.batchdate,
                    result.fullname,
                    result.subjectsId,
                    result.courseId,
                    result.batch_year,
                    result.loggedin,
                    result.done,
                    result.PHOTO,
                    result.reporting_Time,
                    result.start_time,
                    result.end_time,
                    result.DAY
                );
                
                return student;
            });

            //console.log("Decrypted results:", studentTrackDTOs);
            res.status(200).json(studentTableDTOs);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
}