# AI-based Weak Topic Predictor for Placement Prep

A full-stack app that tracks your quiz attempts across TCS NQT-style topics
(DSA, Aptitude, Reasoning, Verbal) and uses a custom-built scoring + trend
model to tell you exactly where to focus your revision.

---

## How to run in VS Code

**Requirements:** Node.js installed (v16+). Check with `node -v` in terminal.
If not installed, get it from https://nodejs.org.

1. Unzip this folder and open it in VS Code (`File > Open Folder`).
2. Open a terminal in VS Code (`` Ctrl + ` ``).
3. Install backend dependencies:
   ```
   cd backend
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. You'll see:
   ```
   Weak Topic Predictor running -> http://localhost:5000
   ```
6. Open that URL in your browser. That's it — one server serves both the
   API and the frontend, no separate frontend setup needed.

To reset all progress and start fresh, click **"Reset all progress"** on the
quiz page, or just delete the contents of `backend/data/attempts.json` and
replace with `[]`.

---

## Project structure

```
weak-topic-predictor/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── routes/
│   │   ├── quiz.js            # /api/topics, /api/questions, /api/attempt
│   │   └── analytics.js       # /api/analytics (runs the predictor)
│   ├── services/
│   │   └── predictor.js       # The "AI" engine — see below
│   ├── utils/
│   │   └── db.js              # Simple JSON-file storage (no DB setup needed)
│   └── data/
│       ├── questions.json     # 64 seed questions across 16 subtopics
│       └── attempts.json      # Your quiz attempt log (auto-created)
└── frontend/
    ├── index.html             # Dashboard — weak topics, trends, recommendations
    ├── quiz.html               # Topic picker + quiz runner
    ├── css/style.css
    └── js/
        ├── api.js
        ├── dashboard.js
        └── quiz.js
```

---

## How the "AI" part actually works (for your interview)

This is the part you should be able to explain confidently, since it's the
whole point of the project.

### 1. Weakness Score (0–100, higher = weaker)

For every subtopic (e.g. "DSA → Sliding Window"), all attempts are combined
into one score using a weighted formula:

```
weaknessScore = 0.5 × accuracyPenalty + 0.2 × speedPenalty + 0.3 × recencyPenalty
```

- **accuracyPenalty** — simply `1 - accuracy`. Straightforward.
- **speedPenalty** — how much slower than the expected time (based on
  question difficulty) you're averaging. Being technically correct but very
  slow still counts as a weak spot, because that's exactly what costs marks
  in a timed test like TCS NQT.
- **recencyPenalty** — mistakes are weighted with *exponential recency
  decay* (`1.3^i` per attempt index), so a wrong answer from your last
  attempt counts far more than one from three weeks ago. This stops the
  score from being "stuck" on old mistakes you've already fixed.

This is a **heuristic weighted model**, not a black-box ML model — and
that's a deliberate, defensible choice: it's fully explainable, doesn't need
training data you don't have yet, and every weight can be justified in one
sentence (see above). If asked "why not use a real ML classifier," this is
the answer.

### 2. Trend Prediction (the actual predictive/ML part)

For each subtopic, `predictor.js` fits a **simple linear regression
(least-squares)** on your accuracy over your attempts in chronological order
(x = attempt number, y = 1/0 for correct/wrong). The slope of that line
tells you the trend:

- slope > 0.05 → **improving**
- slope < -0.05 → **declining**
- otherwise → **stable**

This is implemented from scratch in plain JavaScript (no ML library) in
`computeTrendSlope()` — genuinely useful to walk through on a whiteboard if
asked, since it's just the standard least-squares formula:

```
slope = Σ((x - x̄)(y - ȳ)) / Σ((x - x̄)²)
```

The reason this matters: a subtopic can have a *decent current score* but a
*negative trend* — meaning you're quietly getting worse at it — and the
dashboard flags that separately from the raw weakness score.

### 3. Recommendations

`buildRecommendation()` turns the numbers into a plain-language sentence
using simple threshold rules (weaknessScore ≥ 60 → "Focus area", declining
trend → "Watch out", etc.) — this is intentionally rule-based on top of the
model's output, not another model, to keep the whole pipeline explainable
end-to-end.

---

## Possible extensions (mention these if asked "what would you add next")

- Swap the JSON file storage for MongoDB/PostgreSQL for multi-user support.
- Add authentication (JWT — you already know this from LinkVault) so
  multiple students can track separate progress.
- Replace the linear regression trend with a proper logistic regression or
  a small decision tree trained on (topic, difficulty, time, streak) →
  correct/wrong, once there's enough real attempt data to train on.
- Add spaced-repetition scheduling: use the weakness score to auto-generate
  tomorrow's practice set instead of manual topic picking.
