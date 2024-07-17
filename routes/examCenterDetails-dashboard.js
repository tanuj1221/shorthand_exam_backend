const express = require('express');
const router = express.Router();
const examCenterController = require('../controllers/centerAdminMonitoring/getExamCenter');
const examCenter = require('../controllers/centerAdminMonitoring/getCenterDetails');
const examCenterFunc = require('../controllers/examCenterAdmin/get_pdfs_data');
const getControllerPassForCenter = require('../controllers/controllerPassword/controllerPassword');
const getPcRegistrations = require('../controllers/controllerPassword/pcRegistration');

router.get('/get-center-centerpass', examCenterController.getExamCenter);
router.get('/get-center-details', examCenter.getExamCenterDetails);
router.get('/get-pdfs', examCenterFunc.getPdfFromExamCenterDb);
router.get('/get-controller-pass', getControllerPassForCenter.getControllerPassForCenter);
router.get('/get-pcregistration', getPcRegistrations.getPcRegistrations);

module.exports = router;