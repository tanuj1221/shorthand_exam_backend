class StudentTableDTO {
    constructor(student_id, instituteId, batchNo, batchdate, fullname, subjectsId, courseId, batch_year, loggedin, done, PHOTO, center, reporting_Time, start_time, end_time) {
        this.student_id = student_id;
        this.instituteId = instituteId;
        this.batchNo = batchNo;
        this.batchdate = batchdate;
        this.fullname = fullname;
        this.subjectsId = subjectsId;
        this.courseId = courseId;
        this.batch_year = batch_year;
        this.loggedin = loggedin;
        this.done = done;
        this.PHOTO = PHOTO;
        this.center = center;
        this.reporting_Time = reporting_Time;
        this.start_time = start_time;
        this.end_time = end_time;
    }
}

module.exports = StudentTableDTO;
