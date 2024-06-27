const connection = require('../../config/db1');
const PdfToDownloadDTO = require('../../dto/pdfsToDownloadDTO');

exports.getPdfFromExamCenterDb = async (req, res) => {
    
    const centerCode = req.session.centerId;

    const query = 'SELECT attendanceroll, absenteereport, answersheet, blankanswersheet FROM examcenterdb where center = ?';
    try{
        const [results] = await connection.query(query, [centerCode]);
        
        if (results.length > 0) {
            console.log("result: "+results);
            const pdfToDownloadDTO = results.map(result => {
                const pdfToDownload = new PdfToDownloadDTO(
                    result.attendanceroll,
                    result.absenteereport,
                    result.answersheet,
                    result.blankanswersheet
                );
                return pdfToDownload;
            });
            res.status(200).json(pdfToDownloadDTO);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
}