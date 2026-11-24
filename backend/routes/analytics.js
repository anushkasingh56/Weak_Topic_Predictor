const express = require('express');
const router = express.Router();
const { getAttempts, clearAttempts } = require('../utils/db');
const { analyze } = require('../services/predictor');

// GET /api/analytics -> full weak-topic analysis
router.get('/analytics', (req, res) => {
  const attempts = getAttempts();
  const result = analyze(attempts);
  res.json(result);
});

// GET /api/analytics/history -> raw attempt log (useful for debugging / charts)
router.get('/analytics/history', (req, res) => {
  res.json(getAttempts());
});

// DELETE /api/analytics -> reset all progress
router.delete('/analytics', (req, res) => {
  clearAttempts();
  res.json({ success: true });
});

module.exports = router;
