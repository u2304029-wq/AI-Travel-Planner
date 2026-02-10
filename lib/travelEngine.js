/**
 * Multimodal travel engine: generates routes with flights, trains, buses, road.
 * Uses simulated data for demonstration; can be wired to real APIs (e.g. Amadeus, Rome2Rio).
 */

const MODES = {
  flight: { name: 'Flight', speedKmh: 800, costPerKm: 0.15, co2Factor: 0.2 },
  train: { name: 'Train', speedKmh: 120, costPerKm: 0.08, co2Factor: 0.05 },
  bus: { name: 'Bus', speedKmh: 70, costPerKm: 0.05, co2Factor: 0.08 },
  car: { name: 'Car', speedKmh: 90, costPerKm: 0.12, co2Factor: 0.15 }
};

// Approximate distances between major cities (simplified; real app would use geocoding + routing API)
const CITY_DISTANCES = {
  'new york': { 'los angeles': 3944, 'chicago': 1147, 'miami': 1742, 'boston': 306 },
  'los angeles': { 'new york': 3944, 'san francisco': 559, 'las vegas': 432 },
  'chicago': { 'new york': 1147, 'los angeles': 2808, 'miami': 1892 },
  'miami': { 'new york': 1742, 'chicago': 1892 },
  'boston': { 'new york': 306 },
  'san francisco': { 'los angeles': 559 },
  'las vegas': { 'los angeles': 432 }
};

function normalizeCity(name) {
  return (name || '').toLowerCase().trim();
}

function getDistance(source, destination) {
  const s = normalizeCity(source);
  const d = normalizeCity(destination);
  if (s === d) return 0;
  const fromMap = CITY_DISTANCES[s];
  if (fromMap && fromMap[d] !== undefined) return fromMap[d];
  const toMap = CITY_DISTANCES[d];
  if (toMap && toMap[s] !== undefined) return toMap[s];
  // Fallback: use a heuristic based on string length + random for demo
  const base = 200 + (s.length + d.length) * 80;
  return Math.round(base + Math.random() * 400);
}

function generateLeg(mode, distanceKm) {
  const m = MODES[mode] || MODES.car;
  const durationMin = Math.round((distanceKm / m.speedKmh) * 60);
  const cost = Math.round(distanceKm * m.costPerKm * (0.9 + Math.random() * 0.2) * 100) / 100;
  return {
    mode,
    modeName: m.name,
    distance_km: Math.round(distanceKm * 10) / 10,
    duration_minutes: durationMin,
    estimated_cost: cost
  };
}

function generateMultimodalOptions(source, destination) {
  const totalKm = getDistance(source, destination);
  const options = [];

  // Option 1: Single mode (flight for long, train/bus for short)
  if (totalKm > 500) {
    options.push({
      id: 'flight-direct',
      legs: [generateLeg('flight', totalKm)],
      total_distance_km: totalKm,
      total_duration_minutes: Math.round((totalKm / MODES.flight.speedKmh) * 60) + 90,
      total_cost: 0,
      modes: ['flight']
    });
  }
  options.push({
    id: 'train-direct',
    legs: [generateLeg('train', totalKm)],
    total_distance_km: totalKm,
    total_duration_minutes: Math.round((totalKm / MODES.train.speedKmh) * 60),
    total_cost: 0,
    modes: ['train']
  });
  options.push({
    id: 'bus-direct',
    legs: [generateLeg('bus', totalKm)],
    total_distance_km: totalKm,
    total_duration_minutes: Math.round((totalKm / MODES.bus.speedKmh) * 60),
    total_cost: 0,
    modes: ['bus']
  });
  options.push({
    id: 'car-direct',
    legs: [generateLeg('car', totalKm)],
    total_distance_km: totalKm,
    total_duration_minutes: Math.round((totalKm / MODES.car.speedKmh) * 60),
    total_cost: 0,
    modes: ['car']
  });

  // Multimodal: flight + car/train for last mile
  if (totalKm > 800) {
    const flightKm = totalKm * 0.85;
    const groundKm = totalKm - flightKm;
    const leg1 = generateLeg('flight', flightKm);
    const leg2 = generateLeg('car', groundKm);
    const duration = leg1.duration_minutes + 60 + leg2.duration_minutes;
    const cost = leg1.estimated_cost + leg2.estimated_cost;
    options.push({
      id: 'flight-car',
      legs: [leg1, leg2],
      total_distance_km: totalKm,
      total_duration_minutes: duration,
      total_cost: cost,
      modes: ['flight', 'car']
    });
  }

  options.forEach(opt => {
    if (opt.total_cost === 0) {
      opt.total_cost = opt.legs.reduce((s, l) => s + l.estimated_cost, 0);
    }
    if (!opt.total_duration_minutes) {
      opt.total_duration_minutes = opt.legs.reduce((s, l) => s + l.duration_minutes, 0);
    }
  });

  return options.sort((a, b) => a.total_cost - b.total_cost);
}

function getRecommendations(userId, preferences, history, options) {
  const db = require('./db').getDb();
  let prefs = { preferred_modes: [], budget_max: Infinity };
  if (userId) {
    const row = db.prepare('SELECT preferred_modes, budget_max FROM user_preferences WHERE user_id = ?').get(userId);
    if (row) {
      try {
        prefs.preferred_modes = JSON.parse(row.preferred_modes || '[]');
        if (row.budget_max != null) prefs.budget_max = row.budget_max;
      } catch (_) {}
    }
  }
  if (preferences && preferences.preferred_modes) prefs.preferred_modes = preferences.preferred_modes;
  if (preferences && preferences.budget_max != null) prefs.budget_max = preferences.budget_max;

  const scored = options.map(opt => {
    let score = 100;
    const modes = opt.modes || [];
    if (prefs.preferred_modes.length) {
      const match = modes.some(m => prefs.preferred_modes.includes(m));
      if (match) score += 20;
    }
    if (opt.total_cost <= prefs.budget_max) score += 10;
    if (opt.total_duration_minutes < 300) score += 5;
    return { ...opt, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

module.exports = {
  generateMultimodalOptions,
  getRecommendations,
  getDistance,
  MODES
};
