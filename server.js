const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const travelRoutes = require('./routes/travel');
const historyRoutes = require('./routes/history');
const preferencesRoutes = require('./routes/preferences');
const eventsRoutes = require('./routes/events');
const { initDb } = require('./lib/db');

initDb();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'ai-travel-planner-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use('/api/auth', authRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/events', eventsRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI Travel Planner running at http://localhost:${PORT}`);
});
