/**
 * AGENT 04: COGNITIVE BASELINE AGENT
 * Compares current keystroke metrics against historical baselines
 * to analyze potential motor coordination drops or cognitive drift.
 */

const HISTORIC_BASELINE = {
  cpm: 280,
  avgDwellMs: 95,
  flightStdDev: 75
};

/**
 * Calculates drift percentages compared to historic baselines
 * @param {Object} currentMetrics - { cpm, avgDwellMs, flightStdDev }
 * @returns {Object} assessment containing baseline deviation details
 */
export function evaluateCognitiveBaseline(currentMetrics) {
  const logs = ["[AG-04] Loading baseline vector profiles from cache..."];

  const speedDrift = Math.abs(currentMetrics.cpm - HISTORIC_BASELINE.cpm) / HISTORIC_BASELINE.cpm;
  const dwellDrift = Math.abs(currentMetrics.avgDwellMs - HISTORIC_BASELINE.avgDwellMs) / HISTORIC_BASELINE.avgDwellMs;
  const varianceDrift = Math.abs(currentMetrics.flightStdDev - HISTORIC_BASELINE.flightStdDev) / HISTORIC_BASELINE.flightStdDev;

  // Aggregate cognitive coordination deviation index
  const avgDrift = (speedDrift + dwellDrift + varianceDrift) / 3;
  const driftPercentage = Math.round(avgDrift * 100);

  let status = "NORMAL";
  let message = "Cognitive coordination baseline is stable.";

  if (currentMetrics.cpm > 0) {
    logs.push(`[AG-04] Baseline deviation: ${driftPercentage}%.`);
    
    if (driftPercentage > 40) {
      status = "HIGH_DRIFT";
      message = "Significant coordination deviation. Cognitive baseline alerts armed.";
      logs.push("[AG-04] WARNING: Motor coordination speed and flight variance exhibit significant drift!");
    } else {
      logs.push("[AG-04] Cadence parameters fall within nominal drift limits.");
    }
  } else {
    logs.push("[AG-04] Awaiting keystroke baseline signal inputs.");
  }

  return {
    driftPercentage,
    status,
    message,
    logs
  };
}
