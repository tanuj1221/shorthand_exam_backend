
const connection = require('../../config/db1');

exports.loginCenterAdmin= async (req, res) => {
    console.log("Trying center admin login");
    const { centerId, password } = req.body;
    console.log("center: "+centerId+ " password: "+password);
    const centerdbQuery = 'SELECT center, centerpass FROM examcenterdb WHERE center = ?';
  
    try {
        const [results] = await connection.query(centerdbQuery, [centerId]);
        if (results.length > 0) {
            const admin = results[0];
            console.log("data: "+admin);
            console.log(admin)
            let decryptedStoredPassword;
            try {
                console.log("admin pass: "+admin.centerpass + " provide pass: "+password);
                   
            } catch (error) {                
                return;
            }
            
            if (admin.centerpass === password) {
                // Set institute session
                req.session.centerId = admin.center;
                res.status(200).send('Logged in successfully as an center admin!');
                
            } else {
                res.status(401).send('Invalid credentials for center admin');
            }
        } else {
            res.status(404).send('center not found');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
  };