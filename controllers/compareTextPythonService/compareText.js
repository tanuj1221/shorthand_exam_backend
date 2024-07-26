const axios = require('axios');

exports.compareText = async (req, res) => {
    const { ans, studentAns, ignore} = req.body;
    try {
        const response = await axios.post('http://localhost:5000/compare', {
          // Include any data you want to send in the body here
          text1: ans,
          text2: studentAns,
          ignore_list: ignore
        });
    
        // Use the data returned by the service
        const responseData = response.data;
    
        // Send a response back to the client
        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error making POST request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}