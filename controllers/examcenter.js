const connection = require('../config/db1');
const xl = require('excel4node');
const path = require('path');
const fs = require('fs').promises;
const Buffer = require('buffer').Buffer;
const archiver = require('archiver');
const moment = require('moment-timezone');

const { encrypt, decrypt } = require('../config/encrypt');
const { request } = require('http');

exports.loginCenter = async (req, res) => {
    console.log("Trying center login");
    const { centerId, centerPass, ipAddress, diskIdentifier, macAddress } = req.body;
    console.log(`Received data - centerId: ${centerId}, centerPass: ${centerPass}, ipAddress: ${ipAddress}, diskIdentifier: ${diskIdentifier}, macAddress: ${macAddress}`);

    const query1 = 'SELECT * FROM examcenterdb WHERE center = ?';

    try {
        console.log("Ensuring pcregistration table exists");
        // Ensure pcregistration table exists
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS pcregistration (
                id INT AUTO_INCREMENT PRIMARY KEY,
                center VARCHAR(255) NOT NULL,
                ip_address VARCHAR(255) NOT NULL,
                disk_id VARCHAR(255) NOT NULL,
                mac_address VARCHAR(255) NOT NULL
            )
        `;
        await connection.query(createTableQuery);
        console.log("pcregistration table ensured");

        console.log("Querying examcenterdb for centerId");
        const [results] = await connection.query(query1, [centerId]);
        if (results.length > 0) {
            const center = results[0];
            console.log(`Center found: ${JSON.stringify(center)}`);

            // Decrypt the stored centerPass
            let decryptedStoredCenterPass;
            try {
                console.log("Decrypting stored center pass");
                decryptedStoredCenterPass = decrypt(center.centerpass);
                console.log(`Decrypted stored center pass: '${decryptedStoredCenterPass}'`);
            } catch (error) {
                console.error('Error decrypting stored center pass:', error);
                res.status(500).send('Error decrypting stored center pass');
                return;
            }

            // Ensure both passwords are treated as strings
            const decryptedStoredCenterPassStr = String(decryptedStoredCenterPass).trim();
            const providedCenterPassStr = String(centerPass).trim();

            console.log(`Comparing passwords - stored: '${decryptedStoredCenterPassStr}', provided: '${providedCenterPassStr}'`);
            if (decryptedStoredCenterPassStr === providedCenterPassStr) {
                console.log("Passwords match");

                // Check if the PC is already registered
                const checkPcQuery = `
                    SELECT COUNT(*) AS pcExists FROM pcregistration 
                    WHERE center = ? AND ip_address = ? AND disk_id = ? AND mac_address = ?
                `;
                console.log("Checking if the PC is already registered");
                const [checkPcResults] = await connection.query(checkPcQuery, [centerId, ipAddress, diskIdentifier, macAddress]);
                const pcExists = checkPcResults[0].pcExists;

                if (pcExists > 0) {
                    console.log("PC is already registered for the center");
                    res.status(403).send('This PC is already registered for the center');
                    return;
                }

                console.log("PC is not already registered");

                // Check the number of registered PCs for the center
                const countQuery = 'SELECT COUNT(*) AS pcCount FROM pcregistration WHERE center = ?';
                console.log("Checking the number of registered PCs for the center");
                const [countResults] = await connection.query(countQuery, [centerId]);
                const pcCount = countResults[0].pcCount;

                // Get the maximum allowed PCs for the center
                const maxPcQuery = 'SELECT max_pc FROM examcenterdb WHERE center = ?';
                console.log("Getting the maximum allowed PCs for the center");
                const [maxPcResults] = await connection.query(maxPcQuery, [centerId]);
                const maxPcCount = maxPcResults[0].max_pc;

                console.log(`PC count: ${pcCount}, Max PC count: ${maxPcCount}`);
                if (pcCount < maxPcCount) {
                    console.log("Registering new PC");
                    // Insert PC registration log
                    const insertLogQuery = `
                        INSERT INTO pcregistration (center, ip_address, disk_id, mac_address)
                        VALUES (?, ?, ?, ?)
                    `;
                    await connection.query(insertLogQuery, [centerId, ipAddress, diskIdentifier, macAddress]);
                    console.log("PC registered successfully");
                    res.status(200).send('PC registered successfully for the center!');
                } else {
                    console.log("The maximum number of PCs for this center has been reached");
                    res.status(403).send('The maximum number of PCs for this center has been reached');
                }
            } else {
                console.log("Invalid credentials for center");
                res.status(401).send('Invalid credentials for center');
            }
        } else {
            console.log("Center not found");
            res.status(404).send('Center not found');
        }
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};