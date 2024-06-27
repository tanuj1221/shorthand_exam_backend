const express = require('express');
const router = express.Router();

const fetchUpdateTableController = require('../controllers/superAdminController/fetchUpdate')

router.post('/fetch-update-tables', fetchUpdateTableController.fetchUpdateTable);

module.exports = router;