const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');

const studentController = require('../controllers/student_exam');




router.post('/student_login', studentController.loginStudent);

router.post('/audiologs', studentController.updateAudioLogs);
router.post('/finalpassagelogs', studentController.updateAudioLogs);
router.post('/feedback', studentController.feedback);
router.get('/student_details', studentController.getStudentDetails);

router.get('/audios', studentController.getaudios);
router.get('/controller_pass', studentController.getcontrollerpass);
module.exports = router;