class PdfToDownloadDTO {
    constructor(attendanceroll, absenteereport, answersheet, blankanswersheet) {
        this.attendanceroll = attendanceroll;
        this.absenteereport = absenteereport; // Added missing parameter
        this.answersheet = answersheet;
        this.blankanswersheet = blankanswersheet;
    }
}

module.exports = PdfToDownloadDTO;
