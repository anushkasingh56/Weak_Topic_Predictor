const fs = require('fs');
const path = require('path');

const ATTEMPTS_FILE = path.join(__dirname, '..', 'data', 'attempts.json');
const QUESTIONS_FILE = path.join(__dirname, '..', 'data', 'questions.json');

// Make sure attempts.json exists before we ever try to read it
function ensureAttemptsFile() {
  if (!fs.existsSync(ATTEMPTS_FILE)) {
    fs.writeFileSync(ATTEMPTS_FILE, '[]', 'utf-8');
  }
}

function getQuestions() {
  const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function getAttempts() {
  ensureAttemptsFile();
  const raw = fs.readFileSync(ATTEMPTS_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function addAttempt(attempt) {
  const attempts = getAttempts();
  attempts.push(attempt);
  fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(attempts, null, 2), 'utf-8');
  return attempt;
}

function clearAttempts() {
  fs.writeFileSync(ATTEMPTS_FILE, '[]', 'utf-8');
}

module.exports = { getQuestions, getAttempts, addAttempt, clearAttempts };
