
const connection = require('../config/db1');

const xl = require('excel4node');

const path = require('path');
const fs = require('fs').promises;
const Buffer = require('buffer').Buffer;

const { encrypt, decrypt } =require('../config/encrypt');
const { request } = require('http');



exports.deleteTable = async (req, res) => {
    const tableName = req.params.tableName;

    // Validate the table name to prevent SQL injection
    const allowedTables = ['students', 'subjectdb', 'audiodb']; // Specify allowed table names
    if (!allowedTables.includes(tableName)) {
        return res.status(400).send('Invalid table name');
    }

    const deleteTableQuery = `DROP TABLE IF EXISTS ??`;

    try {
        await connection.query(deleteTableQuery, [tableName]);
        res.send(`Table ${tableName} deleted successfully`);
    } catch (err) {
        console.error(`Failed to delete table ${tableName}:`, err);
        res.status(500).send(err.message);
    }
};


