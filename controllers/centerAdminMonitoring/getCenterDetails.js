const connection = require('../../config/db1');
const ExamCenterDTO = require('../../dto/examCenterDb');
const encryptionInterface = require('../../config/encrypt')

exports.getExamCenterDetails = async (req, res) => {
    const center = req.session.centerId;
    
    console.log("Center: "+center);
    const query = 'SELECT * FROM examcenterdb WHERE center = ?';

    try{
        const [results] = await connection.query(query, [center]);
        
        if (results.length > 0) {
            const examCenterDTO = results.map(result => {
                const examCenter = new ExamCenterDTO(
                    result.center,
                    result.center_name,
                    result.center_address,
                    result.pc_count,
                    result.max_pc
                );
                if (typeof examCenter.fullname === 'string') {
                    examCenter.center_address = encryptionInterface.decrypt(examCenter.center_address);
                }
                return examCenter;
            });
            res.status(200).json(examCenterDTO);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
}