module.exports.validateSettings = function (s) {
  const num = (v, min, max, name) => {
    if (v == null) return;
    if (typeof v !== 'number' || isNaN(v)) throw `${name} must be a number`;
    if (min != null && v < min) throw `${name} must be >= ${min}`;
    if (max != null && v > max) throw `${name} must be <= ${max}`;
  };
  num(s.baseStake, 0.1, 100000, 'baseStake');
  num(s.minStake, 0.0, 100000, 'minStake');
  num(s.maxStake, 0.0, 1000000, 'maxStake');
  num(s.duration, 1, 100000, 'duration');
  num(s.maxTradesDay, 1, 100000, 'maxTradesDay');
  num(s.maxOpenPositions, 1, 1000, 'maxOpenPositions');
  num(s.maxDailyLoss, 0, 10000000, 'maxDailyLoss');
  num(s.maxDrawdown, 0, 100, 'maxDrawdown');
  num(s.kellyFraction, 0, 1, 'kellyFraction');
  num(s.consecutiveLossLimit, 1, 1000, 'consecutiveLossLimit');
  num(s.confidenceThreshold, 0, 1, 'confidenceThreshold');
  num(s.minEdge, 0.5, 1, 'minEdge');
  num(s.trainingIntervalHours, 1, 10000, 'trainingIntervalHours');
  num(s.minTrainingSamples, 1, 10000000, 'minTrainingSamples');
};
