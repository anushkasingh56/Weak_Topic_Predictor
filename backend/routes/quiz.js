const express = require('express');
const router = express.Router();
const { getQuestions, addAttempt } = require('../utils/db');

// GET /api/topics -> list of topics with their subtopics (for the quiz picker UI)
router.get('/topics', (req, res) => {
  const questions = getQuestions();
  const map = {};
  questions.forEach(q => {
    if (!map[q.topic]) map[q.topic] = new Set();
    map[q.topic].add(q.subtopic);
  });
  const topics = Object.entries(map).map(([topic, subtopicsSet]) => ({
    topic,
    subtopics: Array.from(subtopicsSet)
  }));
  res.json(topics);
});

// GET /api/questions?topic=DSA&subtopic=Arrays&count=5
router.get('/questions', (req, res) => {
  const { topic, subtopic, count } = req.query;
  let questions = getQuestions();

  if (topic) questions = questions.filter(q => q.topic === topic);
  if (subtopic) questions = questions.filter(q => q.subtopic === subtopic);

  // shuffle
  questions = [...questions].sort(() => Math.random() - 0.5);

  const limit = count ? parseInt(count, 10) : questions.length;
  questions = questions.slice(0, limit);

  // Don't leak the answer index to the client before submission
  const safeQuestions = questions.map(({ answer, ...rest }) => rest);
  res.json(safeQuestions);
});

// POST /api/attempt
// body: { questionId, topic, subtopic, difficulty, correct, timeTaken }
router.post('/attempt', (req, res) => {
  const { questionId, topic, subtopic, difficulty, correct, timeTaken } = req.body;

  if (!topic || !subtopic || typeof correct !== 'boolean') {
    return res.status(400).json({ error: 'topic, subtopic and correct (boolean) are required' });
  }

  const attempt = {
    questionId: questionId || null,
    topic,
    subtopic,
    difficulty: difficulty || 2,
    correct,
    timeTaken: timeTaken || 0,
    timestamp: Date.now()
  };

  addAttempt(attempt);
  res.json({ success: true, attempt });
});

// POST /api/answer-check -> verify a single answer without logging (used by quiz UI to show correct option)
router.post('/answer-check', (req, res) => {
  const { questionId, selectedIndex } = req.body;
  const questions = getQuestions();
  const q = questions.find(x => x.id === questionId);
  if (!q) return res.status(404).json({ error: 'question not found' });
  res.json({ correct: q.answer === selectedIndex, correctIndex: q.answer });
});

module.exports = router;
