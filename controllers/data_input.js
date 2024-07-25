const fs = require('fs');
const fastCsv = require('fast-csv');
const pool = require("../config/db1");
const schema = require('../schema/schema');
const moment = require('moment');

exports.importCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const { tableName } = req.params;
  const csvFilePath = req.file.path;

  if (!tableName) {
    fs.unlinkSync(csvFilePath);
    return res.status(400).json({ error: 'Table name is required' });
  }

  try {
    // Read the columns from the CSV if the table does not exist
    let columns;
    const tableExists = await tableAlreadyExists(tableName);

    if (!tableExists) {
      columns = await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(csvFilePath)
          .pipe(fastCsv.parse({ headers: true, encoding: 'utf8' }))
          .on('error', reject)
          .on('data', (row) => {
            stream.pause();
            resolve(Object.keys(row));
            stream.destroy();
          })
          .on('end', () => {
            reject(new Error('No data found in the CSV file'));
          });
      });

      const createTableQuery = `CREATE TABLE IF NOT EXISTS ?? (
        ${columns.map(column => {
          const fieldType = schema[tableName] && schema[tableName][column] ? schema[tableName][column] : 'LONGTEXT';
          return `\`${column}\` ${fieldType}`;
        }).join(', ')}
      )`;

      await executeQuery(createTableQuery, [tableName]);
    } else {
      columns = await getTableColumns(tableName);
    }

    // Insert data
    const stream = fs.createReadStream(csvFilePath)
      .pipe(fastCsv.parse({ headers: true }))
      .on('error', (error) => {
        throw error;
      });

    const chunkSize = 100; // Reduced chunk size
    let chunk = [];
    let totalInserted = 0;

    for await (const row of stream) {
      chunk.push(row);
      if (chunk.length >= chunkSize) {
        await insertChunk(tableName, columns, chunk);
        totalInserted += chunk.length;
        chunk = [];
        console.log(`Inserted ${totalInserted} rows so far...`);
      }
    }

    if (chunk.length > 0) {
      await insertChunk(tableName, columns, chunk);
      totalInserted += chunk.length;
    }

    fs.unlinkSync(csvFilePath);
    res.json({ message: `CSV data imported into table '${tableName}' successfully. Total rows inserted: ${totalInserted}` });
  } catch (error) {
    console.error('Error processing CSV:', error.message);
    fs.unlinkSync(csvFilePath);
    res.status(500).json({ error: error.message });
  }
};

async function executeQuery(query, params, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      try {
        const result = await connection.query(query, params);
        return result;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Query failed, attempt ${i + 1} of ${retries}:`, error.message);
      lastError = error;
      if (error.code === 'ECONNRESET') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
      } else {
        throw error; // For other errors, throw immediately
      }
    }
  }
  throw lastError; // If all retries fail, throw the last error
}

async function tableAlreadyExists(tableName) {
  const [results] = await executeQuery('SHOW TABLES LIKE ?', [tableName]);
  return results.length > 0;
}

async function getTableColumns(tableName) {
  const [results] = await executeQuery('SHOW COLUMNS FROM ??', [tableName]);
  return results.map(result => result.Field);
}

async function insertChunk(tableName, columns, chunk) {
  const insertQuery = `INSERT INTO ?? (${columns.map(column => `\`${column}\``).join(', ')}) VALUES ?`;
  const values = chunk.map(row => {
    const rowValues = columns.map(column => {
      let value = row[column];
      const fieldType = schema[tableName] && schema[tableName][column];

      // Handle null and empty string values
      if (value === '' || value === null || value === undefined) {
        return null;
      }

      // Process courseId and subjectId columns
      if (column === 'courseId' || column === 'subjectId') {
        if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
          value = parseInt(value.replace(/[\[\]\s]/g, ''), 10);
        }
      }

      // Process datetime columns (including loggedin and subm_time)
      if (fieldType === 'DATETIME' || column === 'loggedin' || column === 'subm_time') {
        if (value) {
          const date = moment(value, ['M/D/YYYY H:mm', 'YYYY-MM-DD HH:mm:ss']);
          return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : null;
        }
        return null;
      }

      if (fieldType === 'BOOLEAN') {
        return value && (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value === '1');
      } else if (fieldType === 'INT' || fieldType === 'BIGINT') {
        return isNaN(parseInt(value, 10)) ? null : parseInt(value, 10);
      } else if (fieldType === 'DECIMAL') {
        return isNaN(parseFloat(value)) ? null : parseFloat(value);
      } else if (fieldType === 'DATE') {
        return value ? moment(value).format('YYYY-MM-DD') : null;
      } else if (fieldType === 'TIMESTAMP') {
        return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
      } else {
        return value;
      }
    });
    return rowValues;
  });
  await executeQuery(insertQuery, [tableName, values]);
}