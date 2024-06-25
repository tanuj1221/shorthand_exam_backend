const express = require('express');
const router = express.Router();
const examCenterAdminController = require('../controllers/examCenterAdmin/center_admin_functions');
const examCenterDetails = require('../controllers/centerAdminMonitoring/getCenterDetails');

router.post('/center_admin_login',examCenterAdminController.loginCenterAdmin);
module.exports = router;