(function () {
  const API = '/api';
  let map = null;
  let mapMarkers = [];

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    if (pageId === 'plan') initPlanPage();
    if (pageId === 'history') loadHistory();
    if (pageId === 'preferences') loadPreferences();
  }

  function setAuthUI(user) {
    const navLogin = document.getElementById('navLogin');
    const btnLogout = document.getElementById('btnLogout');
    const userBadge = document.getElementById('userBadge');
    if (user) {
      if (navLogin) navLogin.style.display = 'none';
      if (btnLogout) { btnLogout.hidden = false; btnLogout.style.display = 'inline-block'; }
      if (userBadge) userBadge.textContent = user.email;
    } else {
      if (navLogin) navLogin.style.display = 'inline-block';
      if (btnLogout) btnLogout.hidden = true;
      if (userBadge) userBadge.textContent = '';
    }
  }

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, { ...options, credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  async function checkAuth() {
    try {
      const { user } = await fetchJSON(API + '/auth/me');
      setAuthUI(user);
      return user;
    } catch (_) {
      setAuthUI(null);
      return null;
    }
  }

  // Auth: Login
  document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = document.getElementById('loginError');
    err.textContent = '';
    try {
      await fetchJSON(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.value.trim(),
          password: form.password.value
        })
      });
      await checkAuth();
      showPage('plan');
    } catch (e) {
      err.textContent = e.message || 'Login failed';
    }
  });

  // Auth: Register
  document.getElementById('formRegister')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = document.getElementById('registerError');
    err.textContent = '';
    try {
      await fetchJSON(API + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name?.value?.trim() || null,
          email: form.email.value.trim(),
          password: form.password.value
        })
      });
      await checkAuth();
      showPage('plan');
    } catch (e) {
      err.textContent = e.message || 'Registration failed';
    }
  });

  // Auth tabs
  document.querySelectorAll('.hero .auth-tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.hero .auth-tabs .tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('authLogin').classList.toggle('hidden', tab !== 'login');
      document.getElementById('authRegister').classList.toggle('hidden', tab !== 'register');
    });
  });

  document.querySelectorAll('#authRegister').length && document.getElementById('authRegister').classList.add('hidden');

  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    try {
      await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' });
      await checkAuth();
      showPage('landing');
    } catch (_) {}
  });

  // Nav links
  document.querySelectorAll('.nav-link[data-page], .header-inner [data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.tagName === 'A') e.preventDefault();
      const page = link.dataset.page;
      showPage(page === 'login' ? 'landing' : page);
    });
  });

  // Plan form
  function initPlanPage() {
    document.getElementById('planResults').classList.add('hidden');
  }

  document.getElementById('formPlan')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const source = form.source.value.trim();
    const destination = form.destination.value.trim();
    const start_date = form.start_date?.value || null;
    const end_date = form.end_date?.value || null;
    const resultsEl = document.getElementById('planResults');
    const optionsList = document.getElementById('optionsList');
    optionsList.innerHTML = '<p class="loading">Loading routes…</p>';
    resultsEl.classList.remove('hidden');

    try {
      const prefs = await getPreferencesForPlan();
      const data = await fetchJSON(API + '/travel/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          destination,
          start_date,
          end_date,
          preferences: prefs
        })
      });

      optionsList.innerHTML = '';
      (data.options || []).forEach((opt, i) => {
        const card = document.createElement('div');
        card.className = 'option-card' + (i === 0 ? ' recommended' : '');
        const modes = (opt.modes || opt.legs?.map(l => l.modeName || l.mode) || []).join(' → ');
        const cost = opt.total_cost != null ? opt.total_cost : (opt.legs || []).reduce((s, l) => s + (l.estimated_cost || 0), 0);
        const duration = opt.total_duration_minutes != null ? opt.total_duration_minutes : (opt.legs || []).reduce((s, l) => s + (l.duration_minutes || 0), 0);
        const dist = opt.total_distance_km != null ? opt.total_distance_km : (opt.legs || []).reduce((s, l) => s + (l.distance_km || 0), 0);
        card.innerHTML = `
          <div>
            <span class="option-modes">${modes || 'Multimodal'}</span>
            <div class="option-stats">
              <span>${dist.toFixed(0)} km</span>
              <span>${Math.round(duration / 60)}h ${duration % 60}m</span>
              <span>$${cost.toFixed(2)}</span>
            </div>
          </div>
          <div class="option-actions">
            <button type="button" class="btn btn-primary btn-save-option" data-index="${i}">Save itinerary</button>
          </div>
        `;
        card.dataset.option = JSON.stringify(opt);
        card.dataset.source = source;
        card.dataset.destination = destination;
        card.dataset.start_date = start_date || '';
        card.dataset.end_date = end_date || '';
        optionsList.appendChild(card);
      });

      optionsList.querySelectorAll('.btn-save-option').forEach(btn => {
        btn.addEventListener('click', () => saveItineraryFromCard(btn.closest('.option-card')));
      });

      renderMap(source, destination);
      loadEvents(destination);
    } catch (err) {
      optionsList.innerHTML = '<p class="auth-error">' + (err.message || 'Failed to load routes') + '</p>';
    }
  });

  async function getPreferencesForPlan() {
    try {
      const p = await fetchJSON(API + '/preferences');
      return { preferred_modes: p.preferred_modes, budget_max: p.budget_max };
    } catch (_) {
      return {};
    }
  }

  async function saveItineraryFromCard(card) {
    const opt = JSON.parse(card.dataset.option || '{}');
    const source = card.dataset.source;
    const destination = card.dataset.destination;
    const start_date = card.dataset.start_date;
    const end_date = card.dataset.end_date;
    const total_cost = opt.total_cost != null ? opt.total_cost : (opt.legs || []).reduce((s, l) => s + (l.estimated_cost || 0), 0);
    const total_duration = opt.total_duration_minutes != null ? opt.total_duration_minutes : (opt.legs || []).reduce((s, l) => s + (l.duration_minutes || 0), 0);
    const total_distance_km = opt.total_distance_km != null ? opt.total_distance_km : (opt.legs || []).reduce((s, l) => s + (l.distance_km || 0), 0);
    try {
      await fetchJSON(API + '/travel/save-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          destination,
          start_date: start_date || null,
          end_date: end_date || null,
          selected_option: opt,
          total_distance_km,
          total_duration_minutes: total_duration,
          estimated_cost: total_cost,
          itinerary_json: opt
        })
      });
      alert('Itinerary saved.');
    } catch (e) {
      if (e.message === 'Authentication required') alert('Please log in to save itineraries.');
      else alert(e.message || 'Failed to save');
    }
  }

  function geocodeCity(name) {
    const coords = {
      'new york': [40.7128, -74.006],
      'los angeles': [34.0522, -118.2437],
      'chicago': [41.8781, -87.6298],
      'miami': [25.7617, -80.1918],
      'boston': [42.3601, -71.0589],
      'san francisco': [37.7749, -122.4194],
      'las vegas': [36.1699, -115.1398]
    };
    const key = (name || '').toLowerCase().trim();
    return coords[key] || [39.5 + (key.length % 10) * 0.5, -98 + (key.length % 15)];
  }

  function renderMap(source, destination) {
    const container = document.getElementById('map');
    if (!container) return;
    container.innerHTML = '';
    const src = geocodeCity(source);
    const dst = geocodeCity(destination);
    const center = [(src[0] + dst[0]) / 2, (src[1] + dst[1]) / 2];
    const bounds = [src, dst];
    map = L.map(container).setView(center, 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    mapMarkers.forEach(m => m.remove());
    mapMarkers = [];
    const m1 = L.marker(src).addTo(map).bindPopup(source);
    const m2 = L.marker(dst).addTo(map).bindPopup(destination);
    mapMarkers.push(m1, m2);
    L.polyline([src, dst], { color: '#3b82f6', weight: 3 }).addTo(map);
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  async function loadEvents(destination) {
    const list = document.getElementById('eventsList');
    if (!list) return;
    try {
      const { events } = await fetchJSON(API + '/events?city=' + encodeURIComponent(destination));
      list.innerHTML = events.length
        ? events.map(e => `
            <div class="event-card">
              <strong>${e.name}</strong>
              <span>${e.type} · ${e.venue} · ${e.date}</span>
            </div>
          `).join('')
        : '<p class="text-muted">No events found for this city.</p>';
    } catch (_) {
      list.innerHTML = '<p class="auth-error">Could not load events.</p>';
    }
  }

  async function loadHistory() {
    const list = document.getElementById('historyList');
    const empty = document.getElementById('historyEmpty');
    try {
      const { history } = await fetchJSON(API + '/history');
      if (!history || history.length === 0) {
        list.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
      }
      if (empty) empty.classList.add('hidden');
      list.innerHTML = history.map(h => `
        <div class="history-item">
          <div class="route">${h.source} → ${h.destination}</div>
          <div class="meta">
            ${h.start_date || ''}
            ${h.distance_km != null ? ' · ' + h.distance_km.toFixed(0) + ' km' : ''}
            ${h.duration_minutes != null ? ' · ' + Math.floor(h.duration_minutes / 60) + 'h' : ''}
            ${h.estimated_cost != null ? ' · $' + h.estimated_cost.toFixed(2) : ''}
          </div>
        </div>
      `).join('');
    } catch (_) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
    }
  }

  async function loadPreferences() {
    try {
      const p = await fetchJSON(API + '/preferences');
      document.querySelectorAll('#formPreferences input[name="mode"]').forEach(cb => {
        cb.checked = (p.preferred_modes || []).includes(cb.value);
      });
      const min = document.getElementById('prefBudgetMin');
      const max = document.getElementById('prefBudgetMax');
      if (min) min.value = p.budget_min ?? '';
      if (max) max.value = p.budget_max ?? '';
    } catch (_) {}
  }

  document.getElementById('formPreferences')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const preferred_modes = Array.from(form.querySelectorAll('input[name="mode"]:checked')).map(c => c.value);
    const budget_min = form.budget_min?.value ? parseFloat(form.budget_min.value) : null;
    const budget_max = form.budget_max?.value ? parseFloat(form.budget_max.value) : null;
    try {
      await fetchJSON(API + '/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_modes, budget_min, budget_max })
      });
      alert('Preferences saved.');
    } catch (err) {
      alert(err.message || 'Failed to save preferences');
    }
  });

  checkAuth().then(user => {
    if (user) showPage('plan');
    else showPage('landing');
  });
})();
