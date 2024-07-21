class SubjectWiseResultSummary {
    constructor(subjectsId, subject_name, pass, fail, total, pass_percentage) {
        this.subjectsId = subjectsId;
        this.pass = pass;
        this.fail = fail;
        this.total = total;
    }
}

module.exports = SubjectWiseResultSummary;
