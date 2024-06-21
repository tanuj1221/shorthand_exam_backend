const express = require('express');
const multer = require('multer');
const router = express.Router();
const adminFunctionController = require('../controllers/admin_functions');






router.delete('/deletetable/:tableName',  adminFunctionController.deleteTable);






module.exports = router;