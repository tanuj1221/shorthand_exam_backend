class StudentProgress {
    
    constructor(student_id, center, fullname, batchNo, loginTime, login, done, reporting_time, start_time, end_time, trial, passageA, passageB, trial_time, audio1_time, passage1_time, audio2_time, passage2_time, feedback_time, logout_time) {
        this.student_id = student_id;
        this.center = center;
        this.firstName = fullname;
        this.batchNo = batchNo;
        this.loginTime = loginTime;
        this.login = login;
        this.done = done;
        this.reporting_time = reporting_time;
        this.start_time = start_time;
        this.end_time = end_time;
        this.trial = trial;
        this.passageA = passageA;
        this.passageB = passageB;
        this.trial_time = trial_time;
        this.audio1_time = audio1_time;
        this.passage1_time = passage1_time;
        this.audio2_time = audio2_time;
        this.passage2_time = passage2_time;
        this.feedback_time = feedback_time;
        this.logout_time = logout_time;
    }
}

module.exports = StudentProgress;
