
const connection = require('../../config/db1');

const xl = require('excel4node');

const path = require('path');
const fs = require('fs').promises;
const Buffer = require('buffer').Buffer;

const { encrypt, decrypt } =require('../../config/encrypt');
const { request } = require('http');

exports.loginCenterAdmin= async (req, res) => {
    console.log("Trying center admin login");
    const { centerId, password } = req.body;
    console.log("center: "+centerId+ " password: "+password);
    const centerdbQuery = 'SELECT center, centerpass FROM examcenterdb WHERE center = ?';
  
    try {
        const [results] = await connection.query(centerdbQuery, [centerId]);
        if (results.length > 0) {
            const admin = results[0];
            console.log("data: "+admin);
            console.log(admin)
            let decryptedStoredPassword;
            try {
                console.log("admin pass: "+admin.centerpass);
                decryptedStoredPassword = decrypt(admin.centerpass);
                //console.log(`Decrypted stored password: '${decryptedStoredPassword}'`);   
            } catch (error) {
                console.error('Error decrypting stored password:', error);
                res.status(500).send('Error decrypting stored password');
                return;
            }
            // Ensure both passwords are treated as strings
            const decryptedStoredPasswordStr = String(decryptedStoredPassword).trim();
            const providedPasswordStr = String(password).trim();
         
            if (decryptedStoredPasswordStr === providedPasswordStr) {
                // Set institute session
                req.session.centerId = admin.center;
                res.status(200).send('Logged in successfully as an center admin!');
                
            } else {
                res.status(401).send('Invalid credentials for center admin');
            }
        } else {
            res.status(404).send('center not found');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
  };