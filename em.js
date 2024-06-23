const connection = require('../config/db1');

const xl = require('excel4node');

const path = require('path');
const fs = require('fs').promises;
const Buffer = require('buffer').Buffer;
const archiver = require('archiver');
const moment = require('moment-timezone');

const { encrypt, decrypt } =require('../config/encrypt');
const { request } = require('http');
exports.loginStudent = async (req, res) => {
    console.log("Trying student login");
    const { userId, password, ipAddress, diskIdentifier, macAddress } = req.body;
    console.log(userId, password, ipAddress, diskIdentifier, macAddress)

    const query1 = 'SELECT * FROM students WHERE student_id = ?';

    try {
        // Ensure loginlogs table exists
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS loginlogs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                login_time DATETIME NOT NULL,
                ip_address VARCHAR(255) NOT NULL,
                disk_id VARCHAR(255) NOT NULL,
                mac_address VARCHAR(255) NOT NULL
            )
        `;
        await connection.query(createTableQuery);

        const [results] = await connection.query(query1, [userId]);
        if (results.length > 0) {
            const student = results[0];
            console.log(student);

            // Decrypt the stored password
            let decryptedStoredPassword;
            try {
                decryptedStoredPassword = decrypt(student.password);
                console.log(`Decrypted stored password: '${decryptedStoredPassword}'`);
            } catch (error) {
                console.error('Error decrypting stored password:', error);
                res.status(500).send('Error decrypting stored password');
                return;
            }

            // Ensure both passwords are treated as strings
            const decryptedStoredPasswordStr = String(decryptedStoredPassword).trim();
            const providedPasswordStr = String(password).trim();
         
            if (decryptedStoredPasswordStr === providedPasswordStr) {
                // Set student session
                req.session.studentId = student.student_id;
                
                // Fetch the examCenterCode
                const examCenterCode = student.examCenterCode;

                // Get the current time in Kolkata, India
                const loginTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                // Insert login log
                const insertLogQuery = `
                    INSERT INTO loginlogs (student_id, login_time, mac_address, ip_address, disk_id)
                    VALUES (?, ?, ?, ?, ?)
                `;
                await connection.query(insertLogQuery, [userId, loginTime, ipAddress, diskIdentifier, macAddress ]);

                res.send('Logged in successfully as a student!');
            } else {
                res.status(401).send('Invalid credentials for student');
            }
        } else {
            res.status(404).send('Student not found');
        }
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal server error');
    }
};

const columnsToKeep = ['student_id', 'subjectsId', 'instituteId', 'examCenterCode', 'PHOTO', 'courseId'];
const columnsToKeepsub = ['subjectId', 'courseId'];
const columnsToKeepaud = ['subjectId'];
const columnsToKeepcontroller = ['center', 'controller_code', 'district'];
const columnsToKeepcenter = ['sr', 'center', 'district', 'taluka', 'center_name', 'center_address', 'pc_count', 'win_10', 'internet', 'headphone', 'dates', 'Sanmatipatira'];

exports.getStudentDetails = async (req, res) => {
    // Assuming studentId is stored in the session
    const studentId = req.session.studentId;

    const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
    const subjectsQuery = 'SELECT * FROM subjectdb WHERE subjectId = ?';

    try {
        // Fetch student data
        const [students] = await connection.query(studentQuery, [studentId]);
        if (students.length === 0) {
            return res.status(404).send('Student not found');
        }
        const student = students[0];
        console.log(student)

        // Decrypt the encrypted fields

        // Decrypt the encrypted fields
        for (const field in student) {
            if (student.hasOwnProperty(field) && !columnsToKeep.includes(field)) {
                try {
                    console.log(`Decrypting field: ${field}`); // Debugging
                    student[field] = decrypt(student[field]);
                    console.log(`Decrypted value: ${student[field]}`); // Debugging
                } catch (err) {
                    console.error(`Failed to decrypt field ${field}:`, err);
                    throw new Error(`Failed to decrypt field ${field}`);
                }
            }
        }

        // Extract subjectsId and parse it to an array
        let subjectsId;
        try {
            subjectsId = JSON.parse(student.subjectsId);
        } catch (err) {
            console.error('Failed to parse subjectsId:', err);
            return res.status(500).send('Invalid subjectsId format');
        }

        // Assuming you want the first subject from the array
        const subjectId = subjectsId[0];

        // Fetch the subject data
        const [subjects] = await connection.query(subjectsQuery, [subjectId]);
        if (subjects.length === 0) {
            return res.status(404).send('Subject not found');
        }
        const subject = subjects[0];
        for (const field in subject) {
            if (subject.hasOwnProperty(field) && !columnsToKeepsub.includes(field)) {
                try {
                    console.log(`Decrypting field: ${field}`); // Debugging
                    subject[field] = decrypt(subject[field]);
                    console.log(`Decrypted value: ${subject[field]}`); // Debugging
                } catch (err) {
                    console.error(`Failed to decrypt field ${field}:`, err);
                    throw new Error(`Failed to decrypt field ${field}`);
                }
            }
        }

        // Encode photo to base64 string
        const photoPath = path.join(__dirname, 'compressed', student.PHOTO); // Correct the folder name if needed
        let photoBase64;
        try {
            const photoData = await fs.readFile(photoPath, { encoding: 'base64' });
            photoBase64 = photoData;
        } catch (err) {
            console.error('Failed to read photo file:', err);
            return res.status(500).send('Failed to read photo file');
        }

        // Combine data by spreading student and subject objects
        const responseData = {
            ...student,
            ...subject, // Spread the subject properties into the main object
            photo: photoBase64 // Base64 encoded photo string
        };

        // Encrypt all fields in responseData
        const encryptedResponseData = {};
        for (let key in responseData) {
            if (responseData.hasOwnProperty(key)) {
                encryptedResponseData[key] = encrypt(responseData[key].toString());
            }
        }

        res.send(encryptedResponseData);
    } catch (err) {
        console.error('Failed to fetch student details:', err);
        res.status(500).send(err.message);
    }
};

exports.getaudios = async (req, res) => {
    const studentId = req.session.studentId;
    const studentQuery = 'SELECT * FROM students WHERE student_id = ?';
    const subjectsQuery = 'SELECT * FROM subjectdb WHERE subjectId = ?';
    const audioQuery = 'SELECT * FROM audiodb WHERE subjectId = ?';

    try {
        const [students] = await connection.query(studentQuery, [studentId]);
        if (students.length === 0) {
            return res.status(404).send('Student not found');
        }
        const student = students[0];
        for (const field in student) {
            if (student.hasOwnProperty(field) && !columnsToKeep.includes(field)) {
                try {
                    console.log(`Decrypting field: ${field}`); // Debugging
                    student[field] = decrypt(student[field]);
                    console.log(`Decrypted value: ${student[field]}`); // Debugging
                } catch (err) {
                    console.error(`Failed to decrypt field ${field}:`, err);
                    throw new Error(`Failed to decrypt field ${field}`);
                }
            }
        }



        // Extract subjectsId and parse it to an array
        const subjectsId = JSON.parse(student.subjectsId);

        // Assuming you want the first subject from the array
        const subjectId = subjectsId[0];
        const [subjects] = await connection.query(subjectsQuery, [subjectId]);
        if (subjects.length === 0) {
            return res.status(404).send('Subject not found');
        }
        const subject = subjects[0];
        for (const field in subject) {
            if (subject.hasOwnProperty(field) && !columnsToKeepsub.includes(field)) {
                try {
                    console.log(`Decrypting field: ${field}`); // Debugging
                    subject[field] = decrypt(subject[field]);
                    console.log(`Decrypted value: ${subject[field]}`); // Debugging
                } catch (err) {
                    console.error(`Failed to decrypt field ${field}:`, err);
                    throw new Error(`Failed to decrypt field ${field}`);
                }
            }
        }


        const [auidos] = await connection.query(audioQuery, [subjectId]);
        if (auidos.length === 0) {
            return res.status(404).send('audio not found');
        }
        const audio = auidos[0];
        for (const field in audio) {
            if (audio.hasOwnProperty(field) && !columnsToKeepaud.includes(field)) {
                try {
                    console.log(`Decrypting field: ${field}`); // Debugging
                    audio[field] = decrypt(audio[field]);
                    console.log(`Decrypted value: ${audio[field]}`); // Debugging
                } catch (err) {
                    console.error(`Failed to decrypt field ${field}:`, err);
                    throw new Error(`Failed to decrypt field ${field}`);
                }
            }
        }


        const responseData = {
            subjectId: subject.subjectId,
            courseId: subject.courseId,
            subject_name: subject.subject_name,
            subject_name_short: subject.subject_name_short,
            Daily_Timer: subject.Daily_Timer,
            Passage_Timer: subject.Passage_Timer,
            Demo_Timer: subject.Demo_Timer,
            audio1: audio.audio1,
            passage1: audio.passage1,
            audio2: audio.audio2,
            passage2: audio.passage2,
            testaudio:audio.testaudio
        };
        const encryptedResponseData = {};
        for (let key in responseData) {
            if (responseData.hasOwnProperty(key)) {
                encryptedResponseData[key] = encrypt(responseData[key].toString());
            }
        }

        res.send(encryptedResponseData);
    } catch (err) {
        console.error('Failed to fetch student details:', err);
        res.status(500).send(err.message);
    }
};

exports.updateAudioLogs = async (req, res) => {
    const studentId = req.session.studentId;
    const { audio_type, percentage } = req.body;

    console.log('Received request:', req.body);
    console.log('Student ID from session:', studentId);

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (!audio_type || !['trial', 'passageA', 'passageB'].includes(audio_type)) {
        return res.status(400).send('Valid audio type is required');
    }

    const findAudioLogQuery = `SELECT * FROM audiologs WHERE student_id = ?`;
    const updateAudioLogQuery = `UPDATE audiologs SET ${audio_type} = ? WHERE student_id = ?`;
    const insertAudioLogQuery = `INSERT INTO audiologs (student_id, ${audio_type}) VALUES (?, ?)`;

    try {
        const [rows] = await connection.query(findAudioLogQuery, [studentId]);

        if (rows.length > 0) {
            const existingLog = rows[0];

            if (percentage === 0 && existingLog[audio_type] !== 0) {
                console.log(`Existing ${audio_type} log is non-zero, requested update is 0, operation aborted.`);
                return res.status(400).send(`Cannot update ${audio_type} to 0 as existing log is non-zero.`);
            }

            console.log('Existing log found, updating:', updateAudioLogQuery, [percentage, studentId]);
            await connection.query(updateAudioLogQuery, [percentage, studentId]);
        } else {
            console.log('No log found, inserting new:', insertAudioLogQuery, [studentId, percentage]);
            await connection.query(insertAudioLogQuery, [studentId, percentage]);
        }

        const responseData = {
            student_id: studentId,
            audio_type: audio_type,
            percentage: percentage // Stored as a number
        };
        console.log('Percentage updated:', responseData);

        res.send(responseData);
    } catch (err) {
        console.error('Failed to update audio logs:', err);
        res.status(500).send(err.message);
    }
};
exports.getAudioLogs = async (req, res) => {
    const studentId = req.session.studentId;
    
    console.log('Student ID from session:', studentId);

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    const findAudioLogQuery = `SELECT * FROM audiologs WHERE student_id = ?`;

    try {
        const [rows] = await connection.query(findAudioLogQuery, [studentId]);

        if (rows.length > 0) {
            console.log('Audio logs found:', rows);
            res.send(rows[0]);
        } else {
            console.log('No audio logs found for student ID:', studentId);
            res.status(404).send('No audio logs found');
        }
    } catch (err) {
        console.error('Failed to fetch audio logs:', err);
        res.status(500).send(err.message);
    }
};

exports.updatePassageFinalLogs = async (req, res) => {
    const studentId = req.session.studentId;
    const { passage_type, text } = req.body;

    console.log('Received request:', req.body);
    console.log('Student ID from session:', studentId);

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    if (!passage_type || !['Typing Passage A', 'Typing Passage B'].includes(passage_type)) {
        return res.status(400).send('Valid passage type is required');
    }

    const findStudentQuery = `SELECT examCenterCode, batchNo FROM students WHERE student_id = ?`;
    const findAudioLogQuery = `SELECT * FROM finalPassageSubmit WHERE student_id = ?`;
    const updateAudioLogQuery = `UPDATE finalPassageSubmit SET ${passage_type} = ? WHERE student_id = ?`;
    const insertAudioLogQuery = `INSERT INTO finalPassageSubmit (student_id, ${passage_type}) VALUES (?, ?)`;

    try {
        // Query the database to get examCenterCode and batchNo
        const [studentRows] = await connection.query(findStudentQuery, [studentId]);

        if (studentRows.length === 0) {
            return res.status(404).send('Student not found');
        }

        const { examCenterCode, batchNo } = studentRows[0];

        const [rows] = await connection.query(findAudioLogQuery, [studentId]);

        if (rows.length > 0) {
            console.log('Existing log found, updating:', updateAudioLogQuery, [text, studentId]);
            await connection.query(updateAudioLogQuery, [text, studentId]);
        } else {
            console.log('No log found, inserting new:', insertAudioLogQuery, [studentId, text]);
            await connection.query(insertAudioLogQuery, [studentId, text]);
        }

        const currentTime = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');
        const sanitizedPassageType = passage_type.replace(/\s+/g, '_'); // Replace spaces with underscores
        const fileName = `${studentId}_${examCenterCode}_${currentTime}_${batchNo}_${sanitizedPassageType}`;
        const txtFilePath = path.join(__dirname, `${fileName}.txt`);
        const zipFilePath = path.join(__dirname, `${fileName}.zip`);

        // Write text to a file
        fs.writeFileSync(txtFilePath, text, 'utf8');

        // Create a zip file
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level
        });

        output.on('close', function() {
            console.log(`${archive.pointer()} total bytes`);
            console.log('Zip file has been finalized and the output file descriptor has closed.');
        });

        archive.on('error', function(err) {
            throw err;
        });

        archive.pipe(output);
        archive.file(txtFilePath, { name: `${fileName}.txt` });
        await archive.finalize();

        // Clean up the text file after zipping
        fs.unlinkSync(txtFilePath);

        const responseData = {
            student_id: studentId,
            passage_type: passage_type,
            text: text // Stored as a string
        };
        console.log('Text updated and zip created:', responseData);

        res.send(responseData);
    } catch (err) {
        console.log('Failed to update passage logs:', err);
        res.status(500).send(err.message);
    }
};

exports.feedback = async (req, res) => {
    const studentId = req.session.studentId;
    const { question1, question2, question3 } = req.body;

    console.log('Received request:', req.body);
    console.log('Student ID from session:', studentId);

    if (!studentId) {
        return res.status(400).send('Student ID is required');
    }

    const findLogQuery = `SELECT * FROM feedbackdb WHERE student_id = ?`;
    const updateLogQuery = `UPDATE feedbackdb SET question1 = ?, question2 = ?, question3 = ? WHERE student_id = ?`;
    const insertLogQuery = `INSERT INTO feedbackdb (student_id, question1, question2, question3) VALUES (?, ?, ?, ?)`;

    try {
        const [rows] = await connection.query(findLogQuery, [studentId]);

        if (rows.length > 0) {
            console.log('Existing log found, updating:', updateLogQuery, [question1, question2, question3, studentId]);
            await connection.query(updateLogQuery, [question1, question2, question3, studentId]);
        } else {
            console.log('No log found, inserting new:', insertLogQuery, [studentId, question1, question2, question3]);
            await connection.query(insertLogQuery, [studentId, question1, question2, question3]);
        }

        const responseData = {
            student_id: studentId,
            question1: question1,
            question2: question2,
            question3: question3
        };
        console.log('Questions updated:', responseData);

        res.send(responseData);
    } catch (err) {
        console.error('Failed to update passage final logs:', err);
        res.status(500).send(err.message);
    }
};



exports.getcontrollerpass = async (req, res) => {
    const studentId = req.session.studentId;
    const studentQuery = 'SELECT examCenterCode FROM students WHERE student_id = ?';
    const centersQuery = 'SELECT * FROM examcenterdb WHERE center = ?';
    const controllersQuery = 'SELECT * FROM controllerdb WHERE center = ?';

    try {
        const [students] = await connection.query(studentQuery, [studentId]);
        if (students.length === 0) {
            return res.status(404).send('Student not found');
        }
        const student = students[0];
        const centrcode = student.examCenterCode


        const [centers] = await connection.query(centersQuery, [centrcode]);
        if (centers.length === 0) {
            return res.status(404).send('Subject not found');
        }
        const center1 = centers[0];
        for (const field in center1) {
            if (center1.hasOwnProperty(field) && !columnsToKeepcenter.includes(field)) {
                try {
                    console.log(`Decrypting field: ${field}`); // Debugging
                    center1[field] = decrypt(center1[field]);
                    console.log(`Decrypted value: ${center1[field]}`); // Debugging
                } catch (err) {
                    console.error(`Failed to decrypt field ${field}:`, err);
                    throw new Error(`Failed to decrypt field ${field}`);
                }
            }
        }



        const [controllers] = await connection.query(controllersQuery, [centrcode]);
        if (controllers.length === 0) {
            return res.status(404).send('Subject not found');
        }

        const controllers1 = controllers[0];
        let decryptedStoredPassword;
        try {
            decryptedStoredPassword = decrypt(controllers1.controller_pass);
            console.log(`Decrypted stored password: '${decryptedStoredPassword}'`);
        } catch (error) {
            console.error('Error decrypting stored password:', error);
            res.status(500).send('Error decrypting stored password');
            return;
        }

        // Ensure both passwords are treated as strings
        const decryptedStoredPasswordStr = String(decryptedStoredPassword).trim();
  

        
       

        const responseData = {
            center: center1.center,
            controllerpass :decryptedStoredPasswordStr,
            center_name : center1.center_name

        };

        const encryptedResponseData = {};
        for (let key in responseData) {
            if (responseData.hasOwnProperty(key)) {
                encryptedResponseData[key] = encrypt(responseData[key].toString());
            }
        }
        console.log(responseData)

        res.send(encryptedResponseData)





    } catch (err) {
        console.error('Failed to fetch student details:', err);
        res.status(500).send(err.message);
    }
};