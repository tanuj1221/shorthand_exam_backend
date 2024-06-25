const express = require('express');
const router = express.Router();
const isAuthenticatedAdmin = require('../middleware/isAuthAdmin')
const centerAdminController = require('../controllers/centerAdminMonitoring/trackStudentProgress');
const getControllerPassForCenter = require('../controllers/controllerPassword/controllerPassword');

router.get('/getAudioLogs/:studentId',  centerAdminController.getAudioLogs);
router.get('/get-controller-pass', getControllerPassForCenter.getControllerPassForCenter)

module.exports = router;
