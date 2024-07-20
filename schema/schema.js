// schema.js
const schema = {
    students: {
        student_id: 'BIGINT PRIMARY KEY',
        password: 'LONGTEXT',
        instituteId: 'BIGINT',
        batchNo: 'INT REFERENCES batchdb(batchNo)',
        batchdate: 'DATE',
        fullname: 'VARCHAR(100)',
        subjectId: 'INT REFERENCES subjectsdb(subjectId)',
        courseId: 'INT',
        batch_year: 'VARCHAR(100)',
        loggedin: 'BOOLEAN',
        done: 'BOOLEAN',
        photo: 'LONGTEXT',
        center: 'INT REFERENCES examcenterdb(center)',
        reporting_time: 'TIME',
        start_time: 'TIME',
        end_time: 'TIME',
        day: 'INT',
        qset: 'INT',
    },
    studentlogs: {
        id: 'BIGINT PRIMARY KEY',
        student_id: 'BIGINT REFERENCES students(student_id)',
        center: 'INT REFERENCES examcenterdb(center)',
        loginTime: 'TIMESTAMP',
        login: 'BOOLEAN',
        trial_time: 'TIMESTAMP',
        audio1_time: 'TIMESTAMP',
        passage1_time: 'TIMESTAMP',
        audio2_time: 'TIMESTAMP',
        passage2_time: 'TIMESTAMP',
        feedback_time: 'TIMESTAMP'
    },
    loginlogs: {
        id: 'BIGINT PRIMARY KEY',
        student_id: 'BIGINT REFERENCES students(student_id), REFERENCES studentlogs(student_id)',
        login_time: 'TIMESTAMP',
        ip_address: 'VARCHAR(50)',
        disk_id: 'VARCHAR(100)',
        mac_address: 'VARCHAR(50)'
    },
    examcenterdb: {
        center: 'INT PRIMARY KEY',
        centerpass: 'LONGTEXT',
        center_name: 'VARCHAR(100)',
        center_address: 'VARCHAR(255)',
        pc_count: 'INT',
        max_pc: 'INT',
        attendanceroll: 'LONGTEXT',
        absenteereport: 'LONGTEXT',
        answersheet: 'LONGTEXT',
        blankanswersheet: 'LONGTEXT'
    },
    controllerdb: {
        center: 'INT REFERENCES examcenterdb(center)',
        batchNo: 'INT REFERENCES batchdb(batchNo)',
        controller_code: 'INT',
        controller_name: 'VARCHAR(100)',
        controller_contact: 'BIGINT',
        controller_email: 'VARCHAR(100)',
        controller_pass: 'LONGTEXT',
        district: 'VARCHAR(100)'
    },
    pcregistration: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        center: 'INT NOT NULL REFERENCES examcenterdb(center)',
        ip_address: 'LONGTEXT NOT NULL',
        disk_id: 'LONGTEXT NOT NULL',
        mac_address: 'LONGTEXT NOT NULL'
    },
    audiodb: {
        id: 'INT PRIMARY KEY',
        subjectId: 'INT REFERENCES subjectsdb(subjectId)',
        audio1: 'VARCHAR(255)',
        passage1: 'LONGTEXT',
        audio2: 'VARCHAR(255)',
        passage2: 'LONGTEXT',
        testaudio: 'VARCHAR(255)'
    },
    audiologs: {
        student_id: 'BIGINT PRIMARY KEY REFERENCES students(student_id), REFERENCES studentlogs(student_id)',
        trial: 'INT',
        passageA: 'INT',
        passageB: 'INT'
    },
    batchdb: {
        batchNo: 'INT PRIMARY KEY',
        batchdate: 'DATE',
        reporting_time: 'TIME',
        start_time: 'TIME',
        end_time: 'TIME',
        batchstatus: 'BOOLEAN'
    },
    feedbackdb: {
        student_id: 'BIGINT PRIMARY KEY REFERENCES students(student_id), REFERENCES studentlogs(student_id)',
        question1: 'LONGTEXT',
        question2: 'LONGTEXT',
        question3: 'LONGTEXT',
        question4: 'LONGTEXT',
        question5: 'LONGTEXT',
        question6: 'LONGTEXT',
        question7: 'LONGTEXT',
        question8: 'LONGTEXT',
        question9: 'LONGTEXT',
        question10: 'LONGTEXT'
    },
    textlogs: {
        student_id: 'BIGINT PRIMARY KEY REFERENCES students(student_id), REFERENCES studentlogs(student_id)',
        mina: 'DECIMAL',
        texta: 'LONGTEXT',
        minb: 'DECIMAL',
        textb: 'LONGTEXT',
        created_at: 'TIMESTAMP'
    },
    finalPassageSubmit: {
        student_id: 'BIGINT PRIMARY KEY REFERENCES students(student_id), REFERENCES studentlogs(student_id)',
        passageA: 'LONGTEXT',
        passageB: 'LONGTEXT',
    },

    // Expert Dashboard
    expertreviewlog: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT',
        passageA: 'TEXT',
        passageB: 'TEXT',
        passageA_word_count: 'INT',
        passageB_word_count: 'INT',
        ansPassageA: 'TEXT',
        ansPassageB: 'TEXT',
        subjectId: 'INT REFERENCES subjectsdb(subjectId), REFERENCES qsetdb(subject_id)',
        qset: 'INT',
        expertId: 'INT REFERENCES expertdb(expertId)',
        loggedin: 'DATETIME',
        status: 'BOOLEAN',
        subm_done: 'BOOLEAN',
        subm_time: 'DATETIME'
    },
    subjectsdb: {
        subjectId: 'INT PRIMARY KEY',
        courseId: 'INT',
        subject_name: 'VARCHAR(100)',
        subject_name_short: 'VARCHAR(50)',
        daily_timer: 'INT',
        passage_timer: 'INT',
        demo_timer: 'INT'
    },
    expertdb: {
        expertId: 'INT PRIMARY KEY',
        password: 'VARCHAR(255)',
        expert_name: 'VARCHAR(255)',
        subject_50: 'BOOLEAN',
        subject_51: 'BOOLEAN',
        subject_52: 'BOOLEAN',
        subject_53: 'BOOLEAN',
        subject_54: 'BOOLEAN',
        subject_55: 'BOOLEAN',
        subject_56: 'BOOLEAN',
        subject_57: 'BOOLEAN',
        subject_60: 'BOOLEAN',
        subject_61: 'BOOLEAN',
        subject_62: 'BOOLEAN',
        subject_63: 'BOOLEAN',
        subject_70: 'BOOLEAN',
        subject_71: 'BOOLEAN',
        subject_72: 'BOOLEAN',
        subject_73: 'BOOLEAN',
        audio_rec: 'BOOLEAN',
        audio_mod: 'BOOLEAN',
        paper_check: 'BOOLEAN',
        paper_mod: 'BOOLEAN',
        super_mod: 'BOOLEAN'
    },
    qsetdb: {
        id: 'INT PRIMARY KEY AUTO_INCREMENT',
        subject_id: 'INT REFERENCES subjectdb(subjectId)',
        Q1PA: 'TEXT',
        Q1PB: 'TEXT',
        Q2PA: 'TEXT',
        Q2PB: 'TEXT',
        Q3PA: 'TEXT',
        Q3PB: 'TEXT',
        Q4PA: 'TEXT',
        Q4PB: 'TEXT'
    }
};

module.exports = schema;