const ControllerPasswordDTO = require('../../dto/controllerPasswordDTO');
const connection = require('../../config/db1');
const encryptionInterface = require('../../config/encrypt');

exports.getControllerPassForCenter = async (req, res) => {
    
    const centerCode = req.session.centerId;

    console.log("CenterCode: "+centerCode);

    const query = 'select controllerdb.center, controllerdb.batchNo, controllerdb.controller_pass, batchdb.Start_time, batchdb.End_Time, batchdb.batchstatus from controllerdb inner join batchdb on controllerdb.batchNo = batchdb.batchNo where batchdb.batchstatus = "active" and controllerdb.center = ?;';

    try{
        const [results] = await connection.query(query, [centerCode]);
        
        console.log("result: "+results);
        if (results.length > 0) {
            const controllerPassDto = results.map(result => {
                const controllerPassDet = new ControllerPasswordDTO(
                    result.center,
                    result.batchNo,
                    result.controller_pass,
                    result.Start_time,
                    result.End_Time,
                    result.batchstatus
                    )
                    if (typeof controllerPassDet.controllerPass === 'string') {
                        controllerPassDet.controllerPass = encryptionInterface.decrypt(controllerPassDet.controllerPass);
                    }
                    return controllerPassDet;
                }
            )
            
            res.status(200).json(controllerPassDto);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
}