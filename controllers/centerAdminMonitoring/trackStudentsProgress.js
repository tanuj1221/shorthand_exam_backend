const connection = require('../../config/db1');
const StudentTrackDTO = require('../../dto/studentProgress');
const encryptionInterface = require('../../config/encrypt');

exports.getStudentsTrack = async (req, res) => {
    const { examCenterCode, batchNo } = req.params;

    //console.log("exam center code: " + examCenterCode);
    //console.log("batch no: " + batchNo);
    
    const queryParams = [];
    let query = `
        SELECT
            students.student_id,
            students.center,
            students.fullname, 
            students.subjectsId,
            students.courseId,
            students.loggedin,
            students.batchNo,
            students.done,
            students.Reporting_Time,
            students.start_time,
            students.end_time,
            audiologs.trial,
            audiologs.passageA,
            audiologs.passageB,
            studentslog.loginTime,
            studentslog.login,
            studentslog.trial_time,
            studentslog.audio1_time,
            studentslog.passage1_time,
            studentslog.audio2_time,
            studentslog.passage2_time,
            studentslog.feedback_time,
            studentslog.logout_time
        FROM 
            students 
        INNER JOIN 
            audiologs 
        ON 
            students.student_id = audiologs.student_id
        INNER JOIN
            studentslog
        ON
            students.student_id = studentslog.student_id
    `;

    if (examCenterCode && examCenterCode !=0 && batchNo) {
        //query = queryExamCenterCodeBatchNo;
        query += ' WHERE students.center = ? AND students.batchNo = ?;'
        queryParams.push(examCenterCode, batchNo);
    } else if (examCenterCode && examCenterCode!=0) {
        //query = queryExamCenterCode;
        query += ' WHERE students.center = ?;'
        queryParams.push(examCenterCode);
    } else if (examCenterCode==0 && batchNo) {
        //query = queryBatchNo;
        query += ' WHERE students.batchNo = ?;'
        queryParams.push(batchNo);
    }

    try {
        //console.log("query: " + query);
        console.log("queryParams: " + queryParams);

        const [results] = await connection.query(query, queryParams);

        if (results.length > 0) {
            const studentTrackDTOs = results.map(result => {
                const studentTrack = new StudentTrackDTO(
                    result.student_id,
                    result.center,
                    result.fullname,
                    result.batchNo,
                    result.loginTime,
                    result.login,
                    result.done,
                    result.Reporting_Time,
                    result.start_time,
                    result.end_time,
                    result.trial,
                    result.passageA,
                    result.passageB,
                    result.trial_time,
                    result.audio1_time,
                    result.passage1_time,
                    result.audio2_time,
                    result.passage2_time,
                    result.feedback_time,
                    result.logout_time
                );
                
                if (typeof studentTrack.fullname === 'string') {
                    studentTrack.fullname = encryptionInterface.decrypt(studentTrack.fullname);
                }
                return studentTrack;
            });

            //console.log("Decrypted results:", studentTrackDTOs);
            res.status(200).json(studentTrackDTOs);
        } else {
            res.status(404).send('No records found!');
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).send(err.message);
    }
}
