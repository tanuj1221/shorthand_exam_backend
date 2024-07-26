const { min } = require('moment-timezone');
const connection = require('../../config/db1');
const { EventEmitter } = require('events');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { Pool } = require('pg');

const progressEmitter = new EventEmitter();

// Configure axios-retry
axiosRetry(axios, {
  retries: 3, // Number of retries
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Delay between retries in milliseconds
  },
  retryCondition: (error) => {
    return error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED';
  },
});

exports.recalculateResults = async (req, res) => {
  try {
    const subjectIdReq = req.params.subject_id;

    const selectQuery = `
      SELECT 
        pw.student_id,
        pw.passageA,
        pw.passageB, 
        pw.ansPassageA,
        pw.ansPassageB,
        pw.qset,
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
    let count = 0;
    for (const row of rows) {
        count++;
        console.log("api call: "+count);
      const { student_id, passageA, passageB, ansPassageA, ansPassageB, qset } = row;
      
      const qpaList = row[`Q${qset}PA`];
      const qpbList = row[`Q${qset}PB`];

      //console.log("qpaList: "+ qpaList);
      //console.log("qpbList: "+qpbList);
      console.log("student_id: "+student_id);
      if (qpaList && qpbList && passageA && ansPassageA && passageB && ansPassageB) {
        const ignore = qpaList.concat(qpbList);

        apiCalls.push(
          axios.post('http://localhost:5000/compare', {
            text1: passageA,
            text2: ansPassageA,
            ignore_list: qpaList ? qpaList.split(',') : []
          }, { timeout: 20000 }), // Increased timeout to 20 seconds
          axios.post('http://localhost:5000/compare', {
            text1: passageB,
            text2: ansPassageB,
            ignore_list: qpbList ? qpbList.split(',') : []
          }, { timeout: 20000 }) // Increased timeout to 20 seconds
        );

        updateStatements.push([0, 0, 0, 0, 0, 0, '', student_id]);
      } else {
        console.warn(`Missing qpaList or qpbList for student_id: ${student_id}`);
      }
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
      if (apiError.code === 'ETIMEDOUT' || apiError.code === 'ECONNREFUSED') {
        console.error('Connection error:', apiError);
        return res.status(500).json({
          success: false,
          message: 'Failed to connect to the API server. Please try again later.',
        });
      } else {
        console.error('Error in API calls:', apiError);
        throw apiError;
      }
    }

    const updateQuery = `
      UPDATE processed_withignore
      SET Mistake_Count_A = ?,
          Mistake_Count_B = ?,
          Marks_A = ?,
          Marks_B = ?,
          Marks_Total = ?,
          Min = ?,
          Result = ?
      WHERE student_id = ?
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