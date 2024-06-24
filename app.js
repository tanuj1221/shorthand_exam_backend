const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const adminFunctionRouter = require('./routes/admin_functions_routes');


// routes 
const dataInputRoutes = require('./routes/data_input_routes')
const studentRoutes = require('./routes/student_exam_routes')
const centerAdminRoutes = require('./routes/center_admin_routes')
const pingMeRoutes = require('./routes/pingMe')
const trackStudentRoutes = require('./routes/track-students-route')

const app = express();
const PORT = 3000;



app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

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





app.use(dataInputRoutes)
app.use(studentRoutes)
app.use(adminFunctionRouter)
app.use(centerAdminRoutes)
app.use(pingMeRoutes)
app.use(trackStudentRoutes)

app.use(express.static(path.join(__dirname, 'build'))); // 'build' is the default directory for create-react-app builds

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  