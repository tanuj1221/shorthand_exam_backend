const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const adminFunctionRouter = require('./routes/admin_functions_routes');
const examcentereRoutes = require('./routes/examcenter_routes')


// routes 
const dataInputRoutes = require('./routes/data_input_routes')
const studentRoutes = require('./routes/student_exam_routes')

const app = express();
const PORT = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'divis@GeYT',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production", // Ensure cookies are sent over HTTPS in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use(examcentereRoutes)
app.use(dataInputRoutes)
app.use(studentRoutes)
app.use(adminFunctionRouter)

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  