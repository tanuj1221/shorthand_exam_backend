const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const adminFunctionRouter = require('./routes/admin_functions_routes');
const examcentereRoutes = require('./routes/examcenter_routes')

const superAdminRoutes = require('./routes/superAdmin_updateDb')

// routes 
const dataInputRoutes = require('./routes/data_input_routes')
const studentRoutes = require('./routes/student_exam_routes')

//shubh routes
const pingMeRoutes = require('./routes/pingMe');
const examCenterLoginDash = require('./routes/examCenterAuth-dashboard');

const expertAuthRoutes = require('./routes/expertsAuth');

const examCenterDetails = require('./routes/examCenterDetails-dashboard');
const trackStudentRoutes = require('./routes/trackStudentRoute');

//shubh result dashboard routes
const subjectWiseDashboard = require('./routes/resultSummary');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'build')));

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; connect-src 'self' http://localhost:5000;"
  );
  next();
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5000'],
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


app.use(examcentereRoutes)
app.use(dataInputRoutes)
app.use(studentRoutes)
app.use(adminFunctionRouter)
app.use(pingMeRoutes)

//super admin dashboard
app.use(superAdminRoutes)

//exam center admin dashboard
app.use(examCenterLoginDash)
app.use(expertAuthRoutes);
app.use(examCenterDetails)
app.use(trackStudentRoutes)

//result dashboard
app.use(subjectWiseDashboard)


app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
  