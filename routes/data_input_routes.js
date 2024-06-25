const express = require('express');
const multer = require('multer');
const router = express.Router();
const csvController = require('../controllers/data_input');
const isAuthenticatedAdmin = require('../middleware/isAuthAdmin')


// Initialize multer with a destination directory for your files
const upload = multer({ dest: 'uploads/' });


router.post('/importcsv/:tableName',upload.single('csvFilePath'), csvController.importCSV);


  
  

module.exports = router;  
  
