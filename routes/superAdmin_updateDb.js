const express = require('express');
const router = express.Router();

const fetchUpdateTableController = require('../superAdminController/fetchUpdateTableController/fetchUpdateTable')

router.post('/fetch-update-tables', fetchUpdateTableController.fetchUpdateTable);

module.exports = router;