const { min } = require('moment-timezone');
const connection = require('../../config/db1');
const { EventEmitter } = require('events');

const progressEmitter = new EventEmitter();

exports.recalculateResults = async (req, res) => {
    try {
        const selectQuery = `SELECT * FROM processed_withignore`;
        const [rows] = await connection.query(selectQuery);
        let countRow = 0;
        const totalRows = rows.length;
        
        for (const row of rows) {
            if(countRow > 5){
                //break;
            }
            const mistakeCountA = parseInt(row.added_count_A, 10) + parseInt(row.missed_count_A, 10) + parseInt(row.spelling_count_A, 10);
            
            const mistakeCountB = parseInt(row.added_count_B, 10) + parseInt(row.missed_count_B, 10) + parseInt(row.spelling_count_B, 10);

            const Marks_A = 50-(mistakeCountA/3);
            const Marks_B = 50-(mistakeCountB/3);
            const Marks_Total = Marks_A+Marks_B;
            const minOfAB = Math.min(Marks_A, Marks_B);
            let result = "";
            if(minOfAB < 15 || Marks_Total < 50)
            {
                result = "fail";
            }else{
                result = "pass";
            }

            console.log("mistakecA: " + mistakeCountA+ " mistakeB: "+mistakeCountB + " marksA: "+Marks_A+" marksB: "+Marks_B + " marks_total: "+ Marks_Total + "minAB: "+minOfAB + " result: "+result);
            
            const updateResult = `UPDATE processed_withignore 
                                 SET Mistake_Count_A = ?, Mistake_Count_B = ?, Marks_A = ?, Marks_B = ?, Marks_Total = ?, Min = ?, Result =?
                                 WHERE student_id = ?`;
            await connection.query(updateResult, [mistakeCountA, mistakeCountB, Marks_A, Marks_B, Marks_Total, minOfAB, result, row.student_id]);
            console.log("updated! "+ countRow++);
            const progress = Math.round((countRow / totalRows) * 100);
            progressEmitter.emit('progress', { progress });
        }
        console.log("updated all the rows");

        // After processing all rows, recalculate the summary
        const summaryQuery = `SELECT 
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

        const [results] = await connection.query(summaryQuery);

        res.status(200).json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
};

exports.getProgress = (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    progressEmitter.on('progress', sendProgress);

    req.on('close', () => {
        progressEmitter.removeListener('progress', sendProgress);
    });
};
