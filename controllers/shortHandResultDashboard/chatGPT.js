const { min } = require('moment-timezone');
const connection = require('../../config/db1');
const { EventEmitter } = require('events');
const axios = require('axios');
const { Pool } = require('pg');

const progressEmitter = new EventEmitter();

exports.recalculateResults = async (req, res) => {
  try {
    const subjectIdReq = req.params.subject_id;

    const selectQuery = `
            SELECT 
            pw.student_id, 
            s.subjectsId,
            qdb.Q1PA, qdb.Q1PB, qdb.Q2PA, qdb.Q2PB, qdb.Q3PA, qdb.Q3PB, qdb.Q4PA, qdb.Q4PB
        FROM 
            processed_withignore pw
        INNER JOIN 
            students s ON pw.student_id = s.student_id
        INNER JOIN 
            qsetdb qdb ON JSON_CONTAINS(s.subjectsId, CAST(qdb.subject_id AS JSON), '$')
        WHERE 
            pw.subjectsId = ?
    `;
    const [rows] = await connection.query(selectQuery, [subjectIdReq]);
    
    const updateStatements = [];
    const apiCalls = [];

    for (const row of rows) {
      const { student_id, passageA, passageB, ansPassageA, ansPassageB, qset } = row;
      
      const qpaList = row[`Q${qset}PA`];
      const qpbList = row[`Q${qset}PB`];

      const ignore = qpaList.concat(qpbList);

      apiCalls.push(
        axios.post('http://localhost:5000/compare', {
          text1: passageA,
          text2: ansPassageA,
          ignore_list: [qpaList]
        }),
        axios.post('http://localhost:5000/compare', {
          text1: passageB,
          text2: ansPassageB,
          ignore_list: [qpbList]
        })
      );

      updateStatements.push([0, 0, 0, 0, 0, 0, '', student_id]);
    }

    try {
      const apiResponses = await Promise.all(apiCalls);

      for (let i = 0; i < apiResponses.length; i += 2) {
        const responseDataA = apiResponses[i].data;
        const responseDataB = apiResponses[i + 1].data;

        const mistakeCountA = responseDataA.added.length + responseDataA.missed.length + responseDataA.spelling.length;
        const mistakeCountB = responseDataB.added.length + responseDataB.missed.length + responseDataB.spelling.length;

        const Marks_A = 50 - (mistakeCountA / 3);
        const Marks_B = 50 - (mistakeCountB / 3);
        const Marks_Total = Marks_A + Marks_B;
        const minOfAB = Math.min(Marks_A, Marks_B);

        const result = minOfAB < 15 || Marks_Total < 50 ? 'fail' : 'pass';

        updateStatements[i / 2] = [mistakeCountA, mistakeCountB, Marks_A, Marks_B, Marks_Total, minOfAB, result, rows[i / 2].student_id];
      }
    } catch (apiError) {
      console.error('Error in API calls:', apiError);
      throw apiError;
    }

    const updateQuery = `
      UPDATE processed_withignore
      SET Mistake_Count_A = VALUES(Mistake_Count_A),
          Mistake_Count_B = VALUES(Mistake_Count_B),
          Marks_A = VALUES(Marks_A),
          Marks_B = VALUES(Marks_B),
          Marks_Total = VALUES(Marks_Total),
          Min = VALUES(Min),
          Result = VALUES(Result)
      WHERE student_id = VALUES(student_id)
    `;

    try {
      await connection.query(updateQuery, updateStatements.flat());
    } catch (updateError) {
      console.error('Error in update query:', updateError);
      throw updateError;
    }

    // Recalculate the summary
    const summaryQuery = `
      SELECT 
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
        pw.subjectsId;
    `;

    try {
      const [results] = await connection.query(summaryQuery);
      res.status(200).json(results);
    } catch (summaryError) {
      console.error('Error in summary query:', summaryError);
      throw summaryError;
    }
  } catch (err) {
    console.error('Error in recalculateResults:', err);
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