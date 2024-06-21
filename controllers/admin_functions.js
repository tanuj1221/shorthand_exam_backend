
const connection = require('../config/db1');

const xl = require('excel4node');

const path = require('path');
const fs = require('fs').promises;
const Buffer = require('buffer').Buffer;

const { encrypt, decrypt } =require('../config/encrypt');
const { request } = require('http');

exports.loginadmin= async (req, res) => {
    console.log("Trying admin login");
    const { userId, password } = req.body;
  
    const query1 = 'SELECT * FROM admindb WHERE adminid = ?';
  
    try {
        const [results] = await connection.query(query1, [userId]);
        if (results.length > 0) {
            const institute = results[0];
            console.log(institute);
  
            if (institute.password === password) {
                // Set institute session
                req.session.adminid = institute.adminid;
                res.send('Logged in successfully as an institute!');
            } else {
                res.status(401).send('Invalid credentials for institute');
            }
        } else {
            res.status(404).send('Institute not found');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
  };

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


