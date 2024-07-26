const { min } = require('moment-timezone');
const connection = require('../../config/db1');
const { EventEmitter } = require('events');
const axios = require('axios');
const { Pool } = require('pg');

const progressEmitter = new EventEmitter();

exports.recalculateResults = async (req, res) => {
    try {
        const subjectIdReq = req.params.subject_id;

        const selectQuery = `SELECT * FROM processed_withignore where subjectsId = ?`;
        const [rows] = await connection.query(selectQuery, [subjectIdReq]);

        let countRow = 0;
        const totalRows = rows.length;
        let studentAnsA = "";
        let studentAnsB = "";
        let ansKeyA = "";
        let ansKeyB = "";
        let responseData ="";
        let mistakeCountA = 0;
        let mistakeCount = 0;
        let qpadbQuery = "";
        let qpbdbQuery = "";

        for (const row of rows) {
            if(countRow >= 1 ){
                //break;
            }
            const studentAnsAQuery = `SELECT passageA FROM processed_withignore WHERE student_id=${row.student_id};`
            //console.log("studentAnsAQuery: "+studentAnsAQuery);
            const studentAnsBQuery = `SELECT passageB FROM processed_withignore WHERE student_id=${row.student_id};`

            const ansKeyAQuery = `SELECT ansPassageA FROM processed_withignore WHERE student_id=${row.student_id};`
            const ansKeyBQuery = `SELECT ansPassageB FROM processed_withignore WHERE student_id=${row.student_id};`


            //console.log("studentAnsAQuery: "+studentAnsAQuery);
            try{
                [studentAnsA] = await connection.query(studentAnsAQuery);
                studentAnsA = studentAnsA[0].passageA;
                
                [studentAnsB] = await connection.query(studentAnsBQuery);
                studentAnsB = studentAnsB[0].passageB;

                [ansKeyA] = await connection.query(ansKeyAQuery);
                ansKeyA = ansKeyA[0].ansPassageA;

                [ansKeyB] = await connection.query(ansKeyBQuery);
                ansKeyB = ansKeyB[0].ansPassageB;

            }catch(e){
                console.log("exception: "+e);
            }
            const subjectIdQuery = `SELECT subjectsId FROM students WHERE student_id=${row.student_id}`;
            const [subjectIdResult] = await connection.query(subjectIdQuery);

            if (subjectIdResult.length === 0) {
                console.log(`No subjectsId found for student_id: ${row.student_id}`);
                continue;
            }

            const subjectsId = subjectIdResult[0].subjectsId.replace(/[\[\]]/g, '');
            
            const getqsetQuery = `SELECT qset from processed_withignore WHERE student_id=${row.student_id} `;
            let [qset] = await connection.query(getqsetQuery);

            qset = qset[0].qset;
            if(qset==1){
                qpadbQuery = `SELECT Q1PA FROM qsetdb WHERE subject_id=${subjectsId}`;
                qpbdbQuery = `SELECT Q1PB FROM qsetdb WHERE subject_id=${subjectsId}`;
            }else if(qset==2){
                qpadbQuery = `SELECT Q2PA FROM qsetdb WHERE subject_id=${subjectsId}`;
                qpbdbQuery = `SELECT Q2PB FROM qsetdb WHERE subject_id=${subjectsId}`;
            }else if(qset==3){
                qpadbQuery = `SELECT Q3PA FROM qsetdb WHERE subject_id=${subjectsId}`;
                qpbdbQuery = `SELECT Q3PB FROM qsetdb WHERE subject_id=${subjectsId}`;
            }else{
                qpadbQuery = `SELECT Q4PA FROM qsetdb WHERE subject_id=${subjectsId}`;
                qpbdbQuery = `SELECT Q4PB FROM qsetdb WHERE subject_id=${subjectsId}`;
            }


            //console.log("qpadaQuery: "+qpadbQuery);
            //console.log("qpbdbQuery: "+qpbdbQuery);

            const [resultQPA] = await connection.query(qpadbQuery);
            const [resultQPB] = await connection.query(qpbdbQuery);
            
            const qpaList = resultQPA.map(item => item.Q1PA);
            //console.log("Q1PA List: ", qpaList);

            const qpbList = resultQPB.map(item => item.Q1PB);
            //console.log("Q1Pb List: ", qpbList);

            const ignore = qpaList.concat(qpbList);
            
            if(ignore){
                try {
                    const response = await axios.post('http://localhost:5000/compare', {
                      
                      text1: studentAnsA,
                      text2: ansKeyA,
                      ignore_list: [qpaList]
                    });
                
                    
                    responseData = response.data;
                
                    // Send a response back to the client
                    //console.log("response: ", responseData);

                    console.log("response: ",responseData.added.length);
                    mistakeCountA = responseData.added.length + responseData.missed.length + responseData.spelling.length;
                    console.log("mistakeCountA: "+mistakeCountA);
                  } catch (error) {
                    console.error('Error making POST request:', error);
                    console.log("ERROR****************************" + error);
                  }
            }
            if(qpbList){
                try {
                    const response = await axios.post('http://localhost:5000/compare', {
                      
                      text1: studentAnsB,
                      text2: ansKeyB,
                      ignore_list: [qpbList]
                    });
                
                    
                    responseData = response.data;
                
                    // Send a response back to the client
                    //console.log("response: ", responseData);

                    //console.log("response: ",responseData.added.length);
                    mistakeCountB = responseData.added.length + responseData.missed.length + responseData.spelling.length;
                    //console.log("mistakeCountB: "+mistakeCountB);
                  } catch (error) {
                    console.error('Error making POST request:', error);
                    console.log("ERROR****************************" + error);
                  }
            }

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

            //console.log("mistakecA: " + mistakeCountA+ " mistakeB: "+mistakeCountB + " marksA: "+Marks_A+" marksB: "+Marks_B + " marks_total: "+ Marks_Total + "minAB: "+minOfAB + " result: "+result);
            
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
            subjectsdb sd ON pw.subjectsId = sd.subjectId COLLATE utf8mb4_unicode_ci
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
