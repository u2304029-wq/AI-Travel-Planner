const express = require('express');
const { getDb } = require('../lib/db');
const { requireAuth, optionalAuth } = require('../lib/auth');
const {
  generateMultimodalOptions,
  getRecommendations
} = require('../lib/travelEngine');

const router = express.Router();

router.post('/plan', optionalAuth(), (req, res) => {
  const { source, destination, start_date, end_date } = req.body;
  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination required' });
  }
  const options = generateMultimodalOptions(source, destination);
  const recommendations = getRecommendations(
    req.session && req.session.userId,
    req.body.preferences,
    null,
    options
  );
  const payload = {
    source,
    destination,
    start_date: start_date || null,
    end_date: end_date || null,
    options: recommendations,
    generated_at: new Date().toISOString()
  };
  res.json(payload);
});

router.post('/save-itinerary', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const {
    source,
    destination,
    start_date,
    end_date,
    selected_option,
    total_distance_km,
    total_duration_minutes,
    estimated_cost,
    itinerary_json
  } = req.body;
  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination required' });
  }
  const db = getDb();
  const start = start_date || new Date().toISOString().slice(0, 10);
  const modes = (selected_option && selected_option.modes)
    ? JSON.stringify(selected_option.modes)
    : '[]';
  const stmt = db.prepare(`
    INSERT INTO travel_history
    (user_id, source, destination, start_date, end_date, modes, distance_km, duration_minutes, estimated_cost, itinerary_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    userId,
    source,
    destination,
    start,
    end_date || null,
    modes,
    total_distance_km || null,
    total_duration_minutes || null,
    estimated_cost || null,
    itinerary_json ? JSON.stringify(itinerary_json) : null
  );
  res.status(201).json({ success: true, message: 'Itinerary saved' });
});

module.exports = router;
