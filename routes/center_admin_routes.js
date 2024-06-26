const express = require('express');
const router = express.Router();
const isAuthenticatedAdmin = require('../middleware/isAuthAdmin')
const centerAdminController = require('../controllers/centerAdminMonitoring/trackStudentProgress');

router.get('/getAudioLogs/:studentId',  centerAdminController.getAudioLogs);

module.exports = router;

