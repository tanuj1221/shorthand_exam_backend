const SubjectWiseResultSummary = require('../../dto/SubjectWiseResultSummary.js');
const connection = require('../../config/db1');


exports.resultSummary = async (req, res) => {
    
    const query = `SELECT 
        pw.subjectsId,
        sd.subject_name,
        SUM(CASE WHEN pw.Result = 'pass' THEN 1 ELSE 0 END) AS pass,
        SUM(CASE WHEN pw.Result = 'fail' THEN 1 ELSE 0 END) AS fail,
        COUNT(*) AS total,
        ROUND((SUM(CASE WHEN pw.Result = 'pass' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS pass_percentage
    FROM 
        processed_withignore pw
    INNER JOIN
        subjectsdb sd ON pw.subjectsId = sd.subjectId
    GROUP BY 
        pw.subjectsId, sd.subject_name
    ORDER BY 
        pw.subjectsId;`;

    try{
        
        const [results] = await connection.query(query);

        console.log("result: "+results);
        if (results.length > 0) {
            const subjectWiseResultSummarys = results.map(result => {
                const subjectWiseResultSummary = new SubjectWiseResultSummary(
                    result.subjectsId,
                    result.pass,
                    result.fail,
                    result.total
                )
                    return subjectWiseResultSummary;
                }
            )
            console.log("subject wise result: "+subjectWiseResultSummarys[0].subjectsId);
            res.status(200).json(subjectWiseResultSummarys);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
}