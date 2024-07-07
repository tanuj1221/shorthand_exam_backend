const pcRegistrationDTO = require('../../dto/pcRegistrationDTO');
const connection = require('../../config/db1');


exports.getPcRegistrations = async (req, res) => {
    
    const centerCode = req.session.centerId;

    console.log("CenterCode: "+centerCode);

    const query = 'select center, ip_address, disk_id, mac_address from pcregistration where center = ?;';

    try{
        const [results] = await connection.query(query, [centerCode]);
        
        console.log("result: "+results);
        if (results.length > 0) {
            const pcResitrationDto = results.map(result => {
                const pcRegistrationDet = new pcRegistrationDTO(
                    result.center,
                    result.ip_address,
                    result.disk_id,
                    result.mac_address,
                    )
                    return pcRegistrationDet;
                }
            )
            
            res.status(200).json(pcResitrationDto);
        } else {
            res.status(404).send('No records found!');
        }
    }catch (err) {
        res.status(500).send(err.message);
    }
}