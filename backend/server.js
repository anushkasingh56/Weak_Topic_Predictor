const express = require('express');
const path = require('path');
const cors = require('cors');

const quizRoutes = require('./routes/quiz');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', quizRoutes);
app.use('/api', analyticsRoutes);

// Serve the frontend (plain HTML/CSS/JS) as static files
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.listen(PORT, () => {
  console.log(`\n  Weak Topic Predictor running -> http://localhost:${PORT}\n`);
});
