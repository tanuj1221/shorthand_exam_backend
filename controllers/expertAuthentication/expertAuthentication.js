const connection = require('../../config/db1');

exports.loginExpertAdmin= async (req, res) => {
    console.log("Trying center admin login");
    const { expertId, password } = req.body;
    console.log("expertId: "+ expertId + "password: "+ password);
    const centerdbQuery = 'SELECT expertId, password FROM expertdb WHERE expertId = ?';
  
    try {
        const [results] = await connection.query(centerdbQuery, [expertId]);
        if (results.length > 0) {
            const admin = results[0];
            console.log("data: "+admin);
            console.log(admin)
            let decryptedStoredPassword;
            try {
                console.log("admin pass: "+admin.password + " provided pass: "+password);
                   
            } catch (error) {                
                return;
            }
            
            if (admin.password === password) {
                // Set institute session
                req.session.expertId = admin.expertId;
                res.status(200).send('Logged in successfully as an expert!');
                
            } else {
                res.status(401).send('Invalid credentials for expert ');
            }
        } else {
            res.status(404).send('expert not found');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
  };

exports.getExpertDetails = async (req, res) => {
    const { expertId } = req.session;

    if (!expertId) {
        res.status(401).send('Unauthorized');
        return;
    }

    const sql = `SELECT expertId, expert_name FROM expertdb WHERE expertId = ?`;

    try {
        const [results] = await connection.query(sql, [expertId]);
        if (results.length > 0) {
            const expertDetails = {
                expertId: results[0].expertId,
                expert_name: results[0].expert_name
            };
            res.status(200).json(expertDetails);
        } else {
            res.status(404).json({ error: 'Expert not found' });
        }
    } catch (err) {
        console.error('Error fetching expert details:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};