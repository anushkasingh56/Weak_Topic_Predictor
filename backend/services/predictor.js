/**
 * predictor.js
 * ------------
 * This is the "AI" core of the Weak Topic Predictor.
 *
 * It does two things, both implemented from scratch (no external ML library),
 * which is deliberate — this is what you explain in an interview:
 *
 * 1. WEAKNESS SCORE  -> a weighted heuristic model that turns raw quiz attempts
 *    into a single 0-100 "how weak is the student here" score per subtopic.
 *    Inputs: accuracy, time taken relative to expected time, and how recent
 *    the mistakes were (recency-weighted, since a topic you got wrong last
 *    week matters more than one you got wrong a month ago).
 *
 * 2. TREND PREDICTION -> a simple linear regression (least squares) fitted on
 *    accuracy-over-attempts per subtopic, to predict whether the student is
 *    improving or declining in that subtopic, independent of the current score.
 *    This is the genuinely "predictive" part: a topic can have a decent
 *    current score but a negative slope, meaning it's quietly getting worse.
 */

// Expected time (in seconds) to comfortably answer a question of a given difficulty
const EXPECTED_TIME_BY_DIFFICULTY = { 1: 30, 2: 45, 3: 60 };

// Weights for the weakness score formula. Must sum to 1.
const WEIGHTS = {
  accuracy: 0.5,   // how often they get it wrong
  speed: 0.2,       // how much slower than expected they are
  recency: 0.3      // whether mistakes are recent (not improving) or old (already fixed)
};

/**
 * Groups attempts by "Topic > Subtopic"
 */
function groupBySubtopic(attempts) {
  const groups = {};
  for (const a of attempts) {
    const key = `${a.topic}||${a.subtopic}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return groups;
}

/**
 * Least squares linear regression.
 * x = attempt index (0, 1, 2, ...) within the subtopic, in chronological order
 * y = 1 if correct, 0 if wrong
 * Returns the slope. Positive slope = improving, negative = declining.
 */
function computeTrendSlope(chronologicalAttempts) {
  const n = chronologicalAttempts.length;
  if (n < 3) return 0; // not enough data points to trust a trend

  const xs = chronologicalAttempts.map((_, i) => i);
  const ys = chronologicalAttempts.map(a => (a.correct ? 1 : 0));

  const xMean = xs.reduce((s, v) => s + v, 0) / n;
  const yMean = ys.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }

  if (denominator === 0) return 0;
  return numerator / denominator; // slope
}

/**
 * Computes the weakness score (0-100, higher = weaker) for one subtopic's attempts.
 */
function computeWeaknessScore(attemptsForSubtopic) {
  const n = attemptsForSubtopic.length;
  const correctCount = attemptsForSubtopic.filter(a => a.correct).length;
  const accuracy = correctCount / n;
  const accuracyPenalty = 1 - accuracy; // 0 = perfect, 1 = always wrong

  // Speed penalty: how much slower than expected, averaged, capped at 2x
  const speedRatios = attemptsForSubtopic.map(a => {
    const expected = EXPECTED_TIME_BY_DIFFICULTY[a.difficulty] || 45;
    return Math.min((a.timeTaken || expected) / expected, 2);
  });
  const avgSpeedRatio = speedRatios.reduce((s, v) => s + v, 0) / n;
  const speedPenalty = Math.max(0, (avgSpeedRatio - 1)); // 0 if at/under expected time, up to 1

  // Recency penalty: exponential decay weighting, most recent mistakes count most.
  // Sort chronologically (oldest first), then weight recent wrong answers higher.
  const chronological = [...attemptsForSubtopic].sort((a, b) => a.timestamp - b.timestamp);
  let weightedWrongSum = 0;
  let weightSum = 0;
  chronological.forEach((a, i) => {
    // more recent attempts get exponentially higher weight
    const recencyWeight = Math.pow(1.3, i);
    weightedWrongSum += recencyWeight * (a.correct ? 0 : 1);
    weightSum += recencyWeight;
  });
  const recencyPenalty = weightSum > 0 ? weightedWrongSum / weightSum : accuracyPenalty;

  const rawScore =
    WEIGHTS.accuracy * accuracyPenalty +
    WEIGHTS.speed * speedPenalty +
    WEIGHTS.recency * recencyPenalty;

  const weaknessScore = Math.round(Math.min(1, Math.max(0, rawScore)) * 100);

  const trendSlope = computeTrendSlope(chronological);
  let trend = 'stable';
  if (trendSlope > 0.05) trend = 'improving';
  else if (trendSlope < -0.05) trend = 'declining';

  return {
    accuracy: Math.round(accuracy * 100),
    avgTimeRatio: Math.round(avgSpeedRatio * 100) / 100,
    weaknessScore,
    trend,
    trendSlope: Math.round(trendSlope * 1000) / 1000,
    attemptsCount: n
  };
}

/**
 * Generates a plain-language recommendation for a subtopic based on its stats.
 */
function buildRecommendation(topic, subtopic, stats) {
  const { accuracy, weaknessScore, trend, attemptsCount } = stats;

  if (weaknessScore >= 60) {
    return `Focus area: ${subtopic} (${topic}) — only ${accuracy}% accuracy across ${attemptsCount} attempts. Revise fundamentals before your next mock test.`;
  }
  if (trend === 'declining') {
    return `Watch out: your accuracy in ${subtopic} (${topic}) is trending down even though the score looks okay. Do a quick refresher.`;
  }
  if (weaknessScore >= 35) {
    return `Needs practice: ${subtopic} (${topic}) is borderline. A short focused practice set should fix it.`;
  }
  return `Strong: ${subtopic} (${topic}) looks solid at ${accuracy}% accuracy. Light revision is enough.`;
}

/**
 * Main entry point: takes all attempts, returns full per-subtopic analysis
 * sorted by weakness score (weakest first), plus a top-3 focus list.
 */
function analyze(attempts) {
  if (!attempts || attempts.length === 0) {
    return { subtopics: [], focusAreas: [], overallAccuracy: null, totalAttempts: 0 };
  }

  const groups = groupBySubtopic(attempts);
  const subtopics = Object.entries(groups).map(([key, groupAttempts]) => {
    const [topic, subtopic] = key.split('||');
    const stats = computeWeaknessScore(groupAttempts);
    return {
      topic,
      subtopic,
      ...stats,
      recommendation: buildRecommendation(topic, subtopic, stats)
    };
  });

  subtopics.sort((a, b) => b.weaknessScore - a.weaknessScore);

  const focusAreas = subtopics.slice(0, 3).filter(s => s.weaknessScore > 0);

  const totalCorrect = attempts.filter(a => a.correct).length;
  const overallAccuracy = Math.round((totalCorrect / attempts.length) * 100);

  return {
    subtopics,
    focusAreas,
    overallAccuracy,
    totalAttempts: attempts.length
  };
}

module.exports = { analyze, computeWeaknessScore, computeTrendSlope };
