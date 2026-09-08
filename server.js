const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { initializeDatabase, sequelize } = require('./config/database');
const seedDatabase = require('./config/seeder');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust Proxy for Railway & Vercel
app.set('trust proxy', 1);

// Express Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'waseem_academy_erp_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours session lifetime
    secure: process.env.NODE_ENV === 'production' // true on Railway
  }
}));

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// Root Route Redirection
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    if (req.session.role === 'admin') {
      return res.redirect('/admin.html');
    } else if (req.session.role === 'teacher') {
      return res.redirect('/teacher.html');
    }
  }
  return res.redirect('/login.html');
});

// Bind API Routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/academic-years', require('./routes/academicYears'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/students', require('./routes/students'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/results', require('./routes/results'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/reports', require('./routes/reports'));

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Connect to Database and Start Server
async function startServer() {
  try {
    // 1. Initialize Database
    await initializeDatabase();
    
    // 2. Synchronize Models
    await sequelize.sync();
    console.log('Database tables synchronized.');

    // 3. Seed Database
    await seedDatabase();

    // 4. Listen on Port
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(` Waseem Science & Commerce Academy ERP Live!`);
      console.log(` Running on: http://localhost:${PORT}`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Failed to start ERP application server:', error);
    process.exit(1);
  }
}

startServer();
