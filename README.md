# AI-Assisted Multimodal Travel Planner

Web-based intelligent platform to plan end-to-end travel using multiple transportation modes (flights, trains, buses, road). Uses AI-style recommendations, travel history, and local event data.

## Features

- **User authentication**: Register and log in with email/password
- **Multimodal route planning**: Source, destination, dates → routes with flights, trains, buses, car
- **Cost, distance, duration**: Per leg and total for each option
- **Personalized recommendations**: Based on saved preferences and travel history
- **Event-based planning**: Local events at destination (festivals, culture, etc.)
- **Interactive map**: Leaflet/OpenStreetMap with route visualization
- **Travel history**: Save and review past itineraries (registered users)
- **Preferences**: Preferred transport modes and budget (registered users)

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla), Leaflet for maps
- **Backend**: Node.js, Express
- **Database**: JSON file store (no native build), stored in `data/travel.json`
- **Session**: express-session (in-memory; use a store for production)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server (creates DB and tables automatically):
   ```bash
   npm start
   ```

3. Open in browser: [http://localhost:3000](http://localhost:3000)

## Usage

- **Guests**: Plan trips and see routes; save itineraries and preferences require login.
- **Registered users**: Log in to save itineraries, set preferences, and view travel history.
- **Plan Trip**: Enter From/To and optional dates → get multimodal options, map, and destination events.
- **My Trips**: View saved travel history (logged-in users).
- **Preferences**: Set preferred modes and budget for better recommendations.

## Project Structure

```
├── server.js           # Express app entry
├── lib/
│   ├── db.js           # SQLite init and getDb
│   ├── auth.js         # requireAuth, optionalAuth
│   └── travelEngine.js # Multimodal route generation, recommendations
├── routes/
│   ├── auth.js         # register, login, logout, me
│   ├── travel.js       # plan, save-itinerary
│   ├── history.js      # list, delete
│   ├── preferences.js  # get, put
│   └── events.js       # events by city
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── data/               # travel.json (created at runtime)
└── scripts/init-db.js  # Optional: init DB only
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register (email, password, name) |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| POST | /api/travel/plan | Plan trip (source, destination, dates) |
| POST | /api/travel/save-itinerary | Save itinerary (auth) |
| GET | /api/history | Travel history (auth) |
| GET | /api/preferences | Get preferences (auth) |
| PUT | /api/preferences | Update preferences (auth) |
| GET | /api/events?city=... | Events at destination |

## Notes

- Route data is simulated for demo; production would integrate real transport/geocoding APIs.
- Events are sample data per city; production would use Eventbrite/Ticketmaster or similar.
- For production: use HTTPS, secure session store, and environment variables for secrets.
