const fs = require('fs');
const fastCsv = require('fast-csv');
const pool = require("../config/db1");

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
          .pipe(fastCsv.parse({ headers: true }))
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
        ${columns.map(column => `\`${column}\` LONGTEXT`).join(', ')}
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

    const chunkSize = 250; // Reduced chunk size
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
  const values = chunk.map(row => columns.map(column => row[column]));
  await executeQuery(insertQuery, [tableName, values]);
}