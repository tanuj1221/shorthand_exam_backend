const express = require('express');
const router = express.Router();

const fetchUpdateTableController = require('../controllers/resultsSuperAdmin/fetchUpdate');


router.post('/fetch-update-resultdb', fetchUpdateTableController.fetchUpdateTable);
//router.put('/update-table/:table_name/:id', updateTableController.updateTable);

module.exports = router;