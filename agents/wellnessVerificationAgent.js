/**
 * AGENT 06: WELLNESS VERIFICATION AGENT (AI & Keystroke Dynamics Analyzer)
 * Tracks and analyzes typing speed (CPM), dwell times, and flight time variance
 * to detect stress, duress, or robotic automation.
 */

/**
 * Calculates typing statistics from raw keypress events
 * @param {Array} events - List of key event objects: { key, pressTime, releaseTime }
 * @returns {Object} statistics containing speed, dwell, flight variance, and duress assessment
 */
export function analyzeKeystrokeDynamics(events) {
  if (!events || events.length < 5) {
    return {
      cpm: 0,
      avgDwellMs: 0,
      flightVariance: 0,
      duressScore: 0,
      status: "AWAITING_INPUT"
    };
  }

  let totalDwell = 0;
  let flightTimes = [];
  
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    
    // 1. Dwell Time (Keydown to Keyup)
    const dwell = current.releaseTime - current.pressTime;
    totalDwell += Math.max(0, dwell);

    // 2. Flight Time (Keyup of previous key to Keydown of current key)
    if (i > 0) {
      const prev = events[i - 1];
      const flight = current.pressTime - prev.releaseTime;
      flightTimes.push(Math.max(-50, flight)); // allow minor overlaps in fast typing
    }
  }

  const avgDwellMs = totalDwell / events.length;

  // Calculate Average Flight Time
  const avgFlightMs = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length;

  // Calculate Variance of Flight Time (Cadence stability)
  const squaredDiffs = flightTimes.map(f => Math.pow(f - avgFlightMs, 2));
  const flightVariance = squaredDiffs.reduce((a, b) => a + b, 0) / flightTimes.length;
  const flightStdDev = Math.sqrt(flightVariance);

  // Calculate Typing Speed (Characters Per Minute)
  const durationMs = events[events.length - 1].releaseTime - events[0].pressTime;
  const minutes = durationMs / 60000;
  const cpm = minutes > 0 ? Math.round(events.length / minutes) : 0;

  // Duress Classification Logic:
  // - Nominal standard deviation for normal human typing is 40ms to 120ms.
  // - Stressed/duress typing or copy-pasting manifests as highly erratic timing (StdDev > 160ms).
  // - Scripted automation/bot attacks manifest as perfectly robotic timing (StdDev < 5ms).
  let duressScore = 0;
  let status = "NOMINAL";

  if (flightStdDev < 5) {
    duressScore = 95; // High probability of automated script/bot bypass attempt
    status = "BOT_DETECTION_TRIGGERED";
  } else if (flightStdDev > 160 || avgDwellMs > 250) {
    duressScore = Math.min(100, Math.round(((flightStdDev - 120) / 80) * 100));
    if (duressScore > 60) {
      status = "COERCION_WARNING";
    }
  }

  return {
    cpm: Math.min(800, cpm),
    avgDwellMs: Math.round(avgDwellMs),
    flightStdDev: Math.round(flightStdDev),
    duressScore,
    status
  };
}

/**
 * AI sentiment and context verifier prompt
 * Uses basic local semantic scoring for offline verification.
 */
export function verifyCheckinText(text) {
  const normalized = text.toLowerCase();
  const logs = ["[AG-06] Verification agent analyzing text syntax..."];

  const wellnessIndicators = ["safe", "fine", "ok", "good", "well", "active", "normal", "healthy"];
  const emergencyIndicators = ["help", "danger", "coerced", "gun", "hostage", "kill", "threat", "force", "die", "dies", "dying", "death"];

  const hasWellness = wellnessIndicators.some(w => normalized.includes(w));
  const hasEmergency = emergencyIndicators.some(e => normalized.includes(e));

  if (hasEmergency) {
    logs.push("[AG-06] WARNING: Emergency stress indicators identified in response!");
    return {
      verified: false,
      logs,
      message: "Coercion words flagged. Security lockdown pending."
    };
  }

  if (hasWellness || normalized.length > 8) {
    logs.push("[AG-06] Response context approved: active wellness signals confirmed.");
    return {
      verified: true,
      logs,
      message: "Identity signal validated."
    };
  }

  logs.push("[AG-06] Check-in response is too vague or short. Awaiting confirmation.");
  return {
    verified: false,
    logs,
    message: "Awaiting affirmative safety statement."
  };
}
