let selectedSubtopics = new Set(); // "Topic||Subtopic"
let questions = [];
let currentIndex = 0;
let sessionResults = []; // {topic, subtopic, correct, timeTaken, difficulty}
let questionStartTime = 0;
let timerInterval = null;

const pickerGrid = document.getElementById('pickerGrid');
const startBtn = document.getElementById('startBtn');
const resetProgressBtn = document.getElementById('resetProgressBtn');

async function initPicker() {
  const topics = await apiGet('/topics');
  pickerGrid.innerHTML = topics.map(t => `
    <div class="topic-block">
      <h3>${t.topic}</h3>
      <div class="chip-row">
        ${t.subtopics.map(sub => `<div class="chip" data-key="${t.topic}||${sub}">${sub}</div>`).join('')}
      </div>
    </div>
  `).join('');

  pickerGrid.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.key;
      if (selectedSubtopics.has(key)) {
        selectedSubtopics.delete(key);
        chip.classList.remove('selected');
      } else {
        selectedSubtopics.add(key);
        chip.classList.add('selected');
      }
    });
  });
}

startBtn.addEventListener('click', startQuiz);
resetProgressBtn.addEventListener('click', async () => {
  if (confirm('This clears all logged attempts and analytics. Continue?')) {
    await apiDelete('/analytics');
    alert('Progress reset.');
  }
});

async function startQuiz() {
  let allQuestions = [];

  if (selectedSubtopics.size === 0) {
    allQuestions = await apiGet('/questions?count=10');
  } else {
    const fetches = Array.from(selectedSubtopics).map(key => {
      const [topic, subtopic] = key.split('||');
      return apiGet(`/questions?topic=${encodeURIComponent(topic)}&subtopic=${encodeURIComponent(subtopic)}&count=4`);
    });
    const results = await Promise.all(fetches);
    allQuestions = results.flat();
  }

  if (allQuestions.length === 0) {
    alert('No questions found for this selection.');
    return;
  }

  questions = allQuestions.sort(() => Math.random() - 0.5);
  currentIndex = 0;
  sessionResults = [];

  document.getElementById('pickerView').style.display = 'none';
  document.getElementById('quizView').style.display = 'block';
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentIndex];
  document.getElementById('questionCounter').textContent = `Question ${currentIndex + 1} / ${questions.length}`;
  document.getElementById('progressFill').style.width = `${(currentIndex / questions.length) * 100}%`;
  document.getElementById('questionText').textContent = q.q;

  const optionList = document.getElementById('optionList');
  optionList.innerHTML = q.options.map((opt, i) => `
    <div class="option" data-index="${i}">${opt}</div>
  `).join('');

  optionList.querySelectorAll('.option').forEach(el => {
    el.addEventListener('click', () => handleAnswer(parseInt(el.dataset.index, 10)));
  });

  questionStartTime = Date.now();
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  const timerEl = document.getElementById('timer');
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    timerEl.textContent = `${mm}:${ss}`;
  }, 250);
}

async function handleAnswer(selectedIndex) {
  clearInterval(timerInterval);
  const q = questions[currentIndex];
  const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);

  const optionEls = document.querySelectorAll('.option');
  optionEls.forEach(el => el.classList.add('disabled'));

  const check = await apiPost('/answer-check', { questionId: q.id, selectedIndex });

  optionEls[check.correctIndex].classList.add('correct');
  if (!check.correct) optionEls[selectedIndex].classList.add('wrong');

  const attempt = {
    questionId: q.id,
    topic: q.topic,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    correct: check.correct,
    timeTaken
  };
  sessionResults.push(attempt);
  await apiPost('/attempt', attempt);

  setTimeout(() => {
    currentIndex++;
    if (currentIndex < questions.length) {
      renderQuestion();
    } else {
      showResults();
    }
  }, 900);
}

function showResults() {
  document.getElementById('quizView').style.display = 'none';
  document.getElementById('resultView').style.display = 'block';

  const correctCount = sessionResults.filter(r => r.correct).length;
  const total = sessionResults.length;
  const avgTime = Math.round(sessionResults.reduce((s, r) => s + r.timeTaken, 0) / total);

  document.getElementById('resultSummaryText').textContent =
    `You answered ${correctCount} out of ${total} correctly. This session has been logged — check the dashboard for updated weak-topic scores.`;

  document.getElementById('summaryGrid').innerHTML = `
    <div class="stat-card"><div class="label">Score</div><div class="value">${correctCount}/${total}</div></div>
    <div class="stat-card"><div class="label">Accuracy</div><div class="value">${Math.round((correctCount / total) * 100)}%</div></div>
    <div class="stat-card"><div class="label">Avg Time / Question</div><div class="value">${avgTime}s</div></div>
  `;
}

document.getElementById('retakeBtn').addEventListener('click', () => {
  document.getElementById('resultView').style.display = 'none';
  document.getElementById('pickerView').style.display = 'block';
  selectedSubtopics.clear();
  document.querySelectorAll('.chip.selected').forEach(c => c.classList.remove('selected'));
});

initPicker();
