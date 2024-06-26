const fs = require('fs');
const fastCsv = require('fast-csv');
const pool = require("../config/db1");
const stream = require('stream');
const util = require('util');

const pipeline = util.promisify(stream.pipeline);

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

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get column names from the first row
    const columns = await getColumnNames(csvFilePath);

    // Create table if not exists
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ?? (
      ${columns.map(column => `\`${column}\` LONGTEXT`).join(', ')}
    )`;
    await connection.query(createTableQuery, [tableName]);

    // Truncate the table
    await connection.query(`TRUNCATE TABLE ??`, [tableName]);

    // Process CSV in chunks
    await processCSVInChunks(connection, tableName, columns, csvFilePath);

    await connection.commit();
    fs.unlinkSync(csvFilePath);
    res.json({ message: `CSV data imported into table '${tableName}' successfully` });
  } catch (error) {
    await connection.rollback();
    console.error('Error processing CSV:', error.message);
    fs.unlinkSync(csvFilePath);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

async function getColumnNames(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(fastCsv.parse({ headers: true }))
      .on('headers', (headers) => {
        resolve(headers);
      })
      .on('error', reject)
      .on('data', () => {
        // We only need the headers, so we can destroy the stream after getting them
        this.destroy();
      });
  });
}

async function processCSVInChunks(connection, tableName, columns, filePath) {
  const chunkSize = 300;
  let chunk = [];
  let rowCount = 0;

  const insertQuery = `INSERT INTO ?? (${columns.map(column => `\`${column}\``).join(', ')}) VALUES ?`;

  await pipeline(
    fs.createReadStream(filePath),
    fastCsv.parse({ headers: true }),
    new stream.Transform({
      objectMode: true,
      transform: async function(row, encoding, callback) {
        chunk.push(row);
        rowCount++;

        if (chunk.length >= chunkSize) {
          await insertChunk(connection, tableName, columns, chunk, insertQuery);
          chunk = [];
          console.log(`Processed ${rowCount} rows`);
        }

        callback();
      },
      flush: async function(callback) {
        if (chunk.length > 0) {
          await insertChunk(connection, tableName, columns, chunk, insertQuery);
          console.log(`Processed ${rowCount} rows`);
        }
        callback();
      }
    })
  );
}

async function insertChunk(connection, tableName, columns, chunk, insertQuery) {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const values = chunk.map(row => {
        return columns.map(column => {
          const value = row[column];
          if (column === 'image' && value) {
            console.log(`Size of image data: ${Buffer.byteLength(value, 'utf8')} bytes`);
          }
          return value;
        });
      });

      await connection.query(insertQuery, [tableName, values]);
      return; // Success, exit the function
    } catch (error) {
      retries++;
      console.error(`Error inserting chunk (attempt ${retries}/${maxRetries}):`, error.message);
      
      if (error.code === 'EPIPE' || error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Connection lost. Attempting to reconnect...');
        connection = await pool.getConnection();
      }

      if (retries === maxRetries) {
        throw error; // Rethrow the error if all retries failed
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
}