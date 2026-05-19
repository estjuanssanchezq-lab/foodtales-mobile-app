(async function(){
  const platosData = await (window.loadPlatos ? window.loadPlatos() : Promise.resolve(getPlatos()));

  // Category definitions (id, i18n key, icon, allowed dish ids)
  const categoryDefs = [
    { id: 'all', key: 'all', icon: '🍽️', allowed: platosData.map(p=>p.id) },
    { id: 'breakfast', key: 'breakfast', icon: '🍳', allowed: ['arepa'] },
    { id: 'lunch', key: 'lunch', icon: '🍲', allowed: ['bandeja','ajiaco','sancocho'] },
    { id: 'dinner', key: 'dinner', icon: '🍽️', allowed: ['bandeja','ajiaco','sancocho'] },
    { id: 'desserts', key: 'desserts', icon: '🍰', allowed: [] },
    { id: 'juices', key: 'juices', icon: '🧃', allowed: [] },
    { id: 'fastFood', key: 'fastFood', icon: '🍔', allowed: ['hamburguesa'] },
    { id: 'traditional', key: 'traditional', icon: '🇨🇴', allowed: ['ajiaco','bandeja','sancocho'] }
  ];

  const chipsWrapper = document.getElementById('chipsWrapper');
  const themeToggle = document.getElementById('themeToggle');
  const openFilterBtn = document.getElementById('openFilterBtn');
  const advancedFilterPanel = document.getElementById('advancedFilterPanel');
  const applyFiltersBtn = document.getElementById('applyFilters');
  const flavorRange = document.getElementById('flavorRange');
  const timeMax = document.getElementById('timeMax');
  const priceMax = document.getElementById('priceMax');
  const distanceMax = document.getElementById('distanceMax');
  const minRating = document.getElementById('minRating');

  const sheet = document.getElementById('bottomSheet');
  const sheetHandle = document.getElementById('sheetHandle');
  const nearbyList = document.getElementById('nearbyList');
  const routesList = document.getElementById('routesList');
  const sheetTabs = document.querySelectorAll('.sheet-tab');

  let selectedCategory = 'all';
  let currentMarkers = [];
  let markerById = {};
  let currentRoute = null;
  let currentTheme = 'dark';

  // create chips with emojis and i18n labels
  categoryDefs.forEach(def => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.category = def.id;
    const label = (window.i18n && window.i18n.t) ? window.i18n.t(def.key) : def.key;
    btn.innerHTML = ` <span class="chip-emoji">${def.icon||''}</span><span class="chip-label">${label}</span>`;
    if (def.id === 'all') btn.classList.add('active');
    btn.addEventListener('click', ()=>{
      // clear any active route when changing category
      removeCurrentRouteLayer();
      document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      selectedCategory = def.id;
      applyFiltersAndUpdate();
    });
    chipsWrapper.appendChild(btn);
  });

  // Update chip labels when language changes
  window.onLanguageChange = function(lang){
    document.querySelectorAll('.chip').forEach(btn=>{
      const id = btn.dataset.category;
      const def = categoryDefs.find(c=>c.id === id);
      if (def) {
        const label = (window.i18n && window.i18n.t) ? window.i18n.t(def.key) : def.key;
        const lblEl = btn.querySelector('.chip-label'); if (lblEl) lblEl.textContent = label;
      }
    });
    // also update sheet tab labels (data-i18n handled by i18n.applyLanguage)
  };

  // If a `filter` query param is present, activate corresponding chip on load
  (function(){
    try {
      const params = new URLSearchParams(window.location.search);
      const f = (params.get('filter') || '').toLowerCase();
      if (!f) return;
      const mapParam = {
        'breakfast':'breakfast', 'desayuno':'breakfast',
        'lunch':'lunch', 'almuerzo':'lunch', 'dinner':'dinner',
        'desserts':'desserts', 'postre':'desserts', 'dessert':'desserts',
        'juices':'juices', 'juice':'juices',
        'fastfood':'fastFood', 'fast-food':'fastFood', 'fast food':'fastFood',
        'traditional':'traditional'
      };
      const target = mapParam[f];
      if (!target) return;
      const chip = document.querySelector(`.chip[data-category="${target}"]`);
      if (chip) {
        document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        selectedCategory = target;
        // ensure any active route is cleared
        removeCurrentRouteLayer();
        applyFiltersAndUpdate();
        // scroll chip into view for UX
        try { chip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch(e){}
      }
    } catch(e){}
  })();

  // allow horizontal scrolling of chips via mouse wheel/trackpad
  if (chipsWrapper) {
    chipsWrapper.addEventListener('wheel', function(e){
      if (Math.abs(e.deltaY) === 0) return; // ignore pure horizontal
      e.preventDefault();
      chipsWrapper.scrollLeft += e.deltaY;
    }, { passive: false });
  }

  // Initialize map
  // Theme + OpenFreeMap style handling
  const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/bright';
  const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

  function loadTheme(){
    const saved = localStorage.getItem('foodtales_theme');
    if (saved === 'light') { document.body.classList.remove('dark'); document.body.classList.add('light'); currentTheme = 'light'; if (themeToggle) themeToggle.textContent = '☀️'; }
    else { document.body.classList.remove('light'); document.body.classList.add('dark'); currentTheme = 'dark'; if (themeToggle) themeToggle.textContent = '🌙'; }
  }

  loadTheme();

  const map = new maplibregl.Map({ container: 'map', style: currentTheme === 'light' ? STYLE_LIGHT : STYLE_DARK, center: [-74.0721, 4.7110], zoom: 12 });

  // apply a subtle map filter for dark mode but keep map readable
  function applyMapTheme(){
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    if (currentTheme === 'dark') mapEl.style.filter = 'contrast(0.98) brightness(0.92)';
    else mapEl.style.filter = 'none';
  }
  applyMapTheme();

  // --- User location (Geolocation API) ---
  let userLocationMarker = null;
  const userLocationSourceId = 'user-location-source';
  const userAccuracyLayerId = 'user-accuracy-layer';

  function metersPerPixel(lat, zoom) {
    return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
  }

  function addUserLocationToMap() {
    if (!('geolocation' in navigator)) { console.warn('Geolocation not available'); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy || 0;

      // Marker element
      if (!userLocationMarker) {
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        userLocationMarker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
      } else {
        userLocationMarker.setLngLat([lng, lat]);
      }

      // Accuracy source + circle layer
      const point = { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { accuracy } };
      if (map.getSource(userLocationSourceId)) {
        try { map.getSource(userLocationSourceId).setData(point); } catch(e) { /* ignore */ }
      } else {
        try {
          map.addSource(userLocationSourceId, { type: 'geojson', data: point });
          map.addLayer({ id: userAccuracyLayerId, type: 'circle', source: userLocationSourceId, paint: {
            'circle-color': 'rgba(66,133,244,0.12)',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-radius': Math.max(8, accuracy / metersPerPixel(lat, map.getZoom()))
          }});
        } catch(e) { console.warn('Failed to add user location layer', e); }
      }

      function updateAccuracy() {
        try {
          const pixels = Math.max(8, (accuracy || 0) / metersPerPixel(lat, map.getZoom()));
          if (map.getLayer(userAccuracyLayerId)) map.setPaintProperty(userAccuracyLayerId, 'circle-radius', pixels);
        } catch(e) {}
      }

      map.on('zoom', updateAccuracy);
      map.on('move', updateAccuracy);

      try { map.flyTo({ center: [lng, lat], zoom: 14, speed: 1.2, curve: 1.4 }); } catch(e) {}
    }, (err) => {
      console.warn('Geolocation error', err && err.message ? err.message : err);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  // collapse bottom sheet when clicking/tapping on the map (but not when clicking inside the sheet)
  try {
    const mapContainer = map.getContainer();
    mapContainer && mapContainer.addEventListener('click', (ev)=>{
      if (!sheet) return;
      if (sheet.classList.contains('collapsed')) return;
      if (sheet.contains(ev.target)) return;
      if (advancedFilterPanel && advancedFilterPanel.contains(ev.target)) return;
      sheet.classList.remove('expanded');
      sheet.classList.add('collapsed');
      sheet.style.height = '';
    });
  } catch(e) { /* ignore if map not ready */ }

  if (themeToggle) themeToggle.addEventListener('click', ()=>{
    if (document.body.classList.contains('dark')) { document.body.classList.remove('dark'); document.body.classList.add('light'); localStorage.setItem('foodtales_theme','light'); themeToggle.textContent = '☀️'; currentTheme = 'light'; }
    else { document.body.classList.remove('light'); document.body.classList.add('dark'); localStorage.setItem('foodtales_theme','dark'); themeToggle.textContent = '🌙'; currentTheme = 'dark'; }
    applyMapTheme();
    // switch tile style to the matching OpenFreeMap style
    map.setStyle(currentTheme === 'light' ? STYLE_LIGHT : STYLE_DARK);
    // Re-apply markers/route after style change but DO NOT trigger geolocation from theme toggle
    map.once('styledata', ()=>{ if (currentRoute) startRoute(currentRoute); else applyFiltersAndUpdate(); });
  });

  function clearMarkers(){ currentMarkers.forEach(m=>m.remove()); currentMarkers = []; }

  function clearMarkerById(){ Object.keys(markerById).forEach(k=>{ try{ const m = markerById[k].marker; if (m) m.remove(); } catch(e){} }); markerById = {}; }

  function createPinElement(text){
    const el = document.createElement('div');
    el.className = 'map-marker';
    const pin = document.createElement('div');
    pin.className = 'pin';
    if (text) pin.textContent = text;
    el.appendChild(pin);
    return el;
  }

  function createPopupForPlato(p){
    const node = document.createElement('div');
    node.className = 'map-popup-card';
    node.innerHTML = `
      <div class="map-popup-image"><img src="${p.imagen}" alt="${p.nombre}" onerror="this.src='https://placehold.co/300x180?text=${encodeURIComponent(p.nombre)}'"></div>
      <div class="map-popup-content">
        <div class="map-popup-name">${p.nombre}</div>
        <div class="map-popup-restaurant">${p.restaurante}</div>
        <div class="map-popup-meta">
          <span class="map-popup-rating">${'⭐'.repeat(Math.floor(p.estrellas))} ${p.estrellas}</span>
          <span class="map-popup-price">💰 $${p.precio.toLocaleString()}</span>
          <span class="map-popup-walk">🚶‍♂️ ${p.tiempoCaminando || p.tiempoCaminando === 0 ? p.tiempoCaminando : (p.distancia ? Math.round((p.distancia||1)*12) : '')} min</span>
        </div>
        <div class="map-popup-actions"><button class="map-popup-btn">Ver Detalles</button></div>
      </div>
    `;
    const popup = new maplibregl.Popup({ offset: [0, -18], closeButton: false }).setDOMContent(node);
    const viewBtn = node.querySelector('.map-popup-btn');
    if (viewBtn) viewBtn.addEventListener('click', ()=> { window.location.href = `dish-detail.html?dish=${p.id}`; });
    return popup;
  }

  function showPlatoPopup(p){
    const popup = createPopupForPlato(p);
    popup.setLngLat([p.lng,p.lat]).addTo(map);
  }

  function addMarkersForPlatos(platosArray){
    clearMarkers(); clearMarkerById();
    platosArray.forEach(p=>{
      if (!p.lat || !p.lng) return;
      const el = createPinElement();
      const marker = new maplibregl.Marker(el).setLngLat([p.lng,p.lat]).addTo(map);
      // Attach popup to marker but do not open it when clicking the nearby list
      const popup = createPopupForPlato(p);
      marker.setPopup(popup);
      // Click on the pin: center the map and open popup
      el.addEventListener('click', (e)=>{ e.stopPropagation(); map.easeTo({ center:[p.lng,p.lat], zoom:14, offset:[0,-100] }); try { marker.togglePopup(); } catch(err) { popup.addTo(map); } });
      currentMarkers.push(marker);
      try { markerById[p.id] = { marker, popup, plato: p }; } catch(e){}
    });
  }

  function renderNearbyList(platosArray){
    nearbyList.innerHTML = '';
    if (!platosArray.length) { nearbyList.innerHTML = `<div class="no-results">No dishes found</div>`; return; }
    platosArray.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'plato-card mini';
      card.innerHTML = `
        <img class="plato-img" src="${p.imagen}" alt="${p.nombre}" onerror="this.src='https://placehold.co/120x80?text=${encodeURIComponent(p.nombre)}'"/>
        <div class="plato-info">
          <div class="plato-nombre">${p.nombre}</div>
          <div class="plato-restaurante">${p.restaurante}</div>
          <div class="plato-stars">${'⭐'.repeat(Math.floor(p.estrellas))} ${p.estrellas}</div>
          <div class="plato-details"><span>📏 ${p.distancia} km</span><span>💰 $${p.precio.toLocaleString()}</span></div>
        </div>
      `;
      // make the entire card clickable: center map, collapse sheet, then open popup (in that order)
      card.addEventListener('click', ()=>{
        try { map.easeTo({ center:[p.lng,p.lat], zoom:14, offset:[0,-120]}); } catch(e){}
        // collapse
        sheet.classList.remove('expanded'); sheet.classList.add('collapsed'); sheet.style.height = '';
        // after collapse transition, open popup for this dish
        const openPopup = ()=>{
          const entry = markerById[p.id];
          if (!entry) return false;
          try {
            if (entry.marker && typeof entry.marker.togglePopup === 'function') { entry.marker.togglePopup(); return true; }
            if (entry.marker && typeof entry.marker.getPopup === 'function' && entry.marker.getPopup()) { entry.marker.getPopup().addTo(map); return true; }
            if (entry.popup) { entry.popup.addTo(map); return true; }
          } catch(e){}
          return false;
        };
        let done = false;
        const onEnd = (ev)=>{ if (ev && ev.target !== sheet) return; if (done) return; done = true; sheet.removeEventListener('transitionend', onEnd); if (!openPopup()) setTimeout(()=>{ openPopup(); }, 250); };
        sheet.addEventListener('transitionend', onEnd);
        setTimeout(()=>{ if (!done) onEnd(); }, 400);
      });
      nearbyList.appendChild(card);
    });
  }

  const routes = [
    { id: 'quick', title: 'Quick Route', description: 'Fast bites and street snacks', duration: '1-1.5h', distance: '2-5 km', stops: ['arepa','hamburguesa'], highlights: ['Quick','Local'] },
    { id: 'cultural', title: 'Cultural Route', description: 'Traditional flavors', duration: '3h', distance: '6 km', stops: ['ajiaco','bandeja','sancocho'], highlights: ['Traditional'] },
    { id: 'best', title: 'Best Rated Route', description: 'Top-rated dishes', duration: '2h', distance: '5 km', stops: ['bandeja','ajiaco'], highlights: ['Top Rated'] }
  ];

  function renderRoutesList(){
    routesList.innerHTML = '';
    routes.forEach(r=>{
      const el = document.createElement('div');
      el.className = 'route-card';
      el.innerHTML = `
        <div class="route-header"><div class="route-title">${r.title}</div><div class="route-duration">${r.duration} • ${r.distance}</div></div>
        <div class="route-desc">${r.description}</div>
        <div class="route-tags">${r.highlights.map(h=>`<span class="tag">${h}</span>`).join('')}</div>
        <div class="route-actions"><button class="btn-primary start-route-btn" data-route="${r.id}">Start Route</button></div>
      `;
      el.querySelector('.start-route-btn').addEventListener('click', ()=>{ startRoute(r); });
      el.addEventListener('click', ()=>{ startRoute(r); });
      routesList.appendChild(el);
    });
  }

  function removeCurrentRouteLayer(){
    if (!currentRoute) return;
    const srcId = `route-src-${currentRoute.id}`;
    const lineId = `route-line-${currentRoute.id}`;
    if (map.getLayer(lineId)) map.removeLayer(lineId);
    if (map.getSource(srcId)) map.removeSource(srcId);
    currentRoute = null;
  }

  function startRoute(route){
    removeCurrentRouteLayer();
    clearMarkers();
    const coords = [];
    const stopPlatos = route.stops.map(id => platosData.find(p=>p.id===id)).filter(Boolean);
    stopPlatos.forEach((p, idx)=>{
      coords.push([p.lng,p.lat]);
      const el = document.createElement('div');
      el.className = 'map-marker route-marker';
      el.innerHTML = `<div class="pin route-pin">${idx+1}</div>`;
      const marker = new maplibregl.Marker(el).setLngLat([p.lng,p.lat]).addTo(map);
      const popup = createPopupForPlato(p);
      marker.setPopup(popup);
      el.addEventListener('click', (e)=>{ e.stopPropagation(); map.easeTo({center:[p.lng,p.lat], zoom:14, offset:[0,-100]}); try { marker.togglePopup(); } catch(err){ popup.addTo(map); } });
      currentMarkers.push(marker);
    });
    if (coords.length > 0){
      // Do not draw connecting lines; only show pins and adjust viewport
      if (coords.length === 1) map.easeTo({ center: coords[0], zoom: 14 });
      else {
        const bounds = coords.reduce((b,c)=> b.extend(c), new maplibregl.LngLatBounds(coords[0],coords[0]));
        map.fitBounds(bounds, { padding: 80 });
      }
    }
    currentRoute = route;
    sheet.classList.add('collapsed');
  }

  function applyFiltersAndUpdate(){
    // clearing any active route state when filtering
    removeCurrentRouteLayer();
    const flavor = parseInt(flavorRange.value || 5, 10);
    const tMax = parseInt(timeMax.value || 60, 10);
    const pMax = parseInt(priceMax.value || 50000, 10);
    const dMax = parseFloat(distanceMax.value || 10);
    const rating = parseFloat(minRating.value || 0);
    let filtered = platosData.filter(p=>{
      if (selectedCategory && selectedCategory !== 'all'){
        const def = categoryDefs.find(c=>c.id === selectedCategory);
        const allowed = def ? def.allowed : [];
        if (Array.isArray(allowed) && allowed.length && !allowed.includes(p.id)) return false;
      }
      if (p.sabor > flavor) return false;
      if (p.tiempoPreparacion > tMax) return false;
      if (p.precio > pMax) return false;
      if (p.distancia > dMax) return false;
      if (rating > 0 && p.estrellas < rating) return false;
      return true;
    });
    addMarkersForPlatos(filtered);
    renderNearbyList(filtered);
  }

  applyFiltersBtn.addEventListener('click', ()=>{ advancedFilterPanel.classList.add('hidden'); applyFiltersAndUpdate(); });

  openFilterBtn.addEventListener('click', ()=>{
    const isHidden = advancedFilterPanel.classList.contains('hidden');
    if (!isHidden) {
      // panel is open, close it
      advancedFilterPanel.classList.add('hidden');
      return;
    }
    // panel is closed: collapse bottom sheet first (if expanded)
    if (sheet && sheet.classList.contains('expanded')) {
      sheet.classList.remove('expanded');
      sheet.classList.add('collapsed');
      sheet.style.height = '';
    }
    // open the panel after a short delay to allow sheet collapse animation
    setTimeout(()=>{ advancedFilterPanel.classList.remove('hidden'); }, 220);
  });

  // Close filter panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!advancedFilterPanel) return;
    if (advancedFilterPanel.classList.contains('hidden')) return;
    if (advancedFilterPanel.contains(e.target)) return;
    if (openFilterBtn && openFilterBtn.contains(e.target)) return;
    advancedFilterPanel.classList.add('hidden');
  });

  // Bottom sheet drag-to-expand/collapse (pointer events)
  (function(){
    const COLLAPSED_H = 160;
    function getExpandedH(){ return Math.round(window.innerHeight * 0.66); }
    let dragging = false;
    let startY = 0;
    let startH = 0;
    let activePointer = null;

    if (sheetHandle) sheetHandle.style.touchAction = 'none';

    sheetHandle && sheetHandle.addEventListener('pointerdown', (ev)=>{
      dragging = true;
      activePointer = ev.pointerId;
      startY = ev.clientY;
      startH = sheet.offsetHeight;
      try { sheetHandle.setPointerCapture(activePointer); } catch(e){}
      sheet.style.transition = 'height 0s';
      // visual feedback for desktop
      sheetHandle.classList && sheetHandle.classList.add('dragging');
    });

    document.addEventListener('pointermove', (ev)=>{
      if (!dragging || ev.pointerId !== activePointer) return;
      const dy = startY - ev.clientY; // positive = drag up
      const maxH = getExpandedH();
      let newH = startH + dy;
      if (newH < COLLAPSED_H) newH = COLLAPSED_H;
      if (newH > maxH) newH = maxH;
      sheet.style.height = newH + 'px';
    });

    function finishDrag(ev){
      if (!dragging || ev.pointerId !== activePointer) return;
      dragging = false;
      try { sheetHandle.releasePointerCapture(activePointer); } catch(e){}
      sheet.style.transition = '';
      // remove dragging cursor
      sheetHandle.classList && sheetHandle.classList.remove('dragging');
      const currentH = sheet.offsetHeight;
      const threshold = (COLLAPSED_H + getExpandedH()) / 2;
      if (Math.abs(currentH - startH) < 8) {
        // treat as tap: toggle
        if (sheet.classList.contains('collapsed')) { sheet.classList.remove('collapsed'); sheet.classList.add('expanded'); }
        else { sheet.classList.remove('expanded'); sheet.classList.add('collapsed'); }
      } else if (currentH >= threshold) {
        sheet.classList.remove('collapsed'); sheet.classList.add('expanded');
        sheet.style.height = '';
      } else {
        sheet.classList.remove('expanded'); sheet.classList.add('collapsed');
        sheet.style.height = '';
      }
      activePointer = null;
    }

    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);
    window.addEventListener('resize', ()=>{ if (sheet.classList.contains('expanded')) sheet.style.height = ''; });
  })();

  sheetTabs.forEach(t=> t.addEventListener('click', ()=>{
    sheetTabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.dataset.tab;
    if (tab === 'nearby') { nearbyList.classList.remove('hidden'); routesList.classList.add('hidden'); }
    else { nearbyList.classList.add('hidden'); routesList.classList.remove('hidden'); }
  }));

  map.on('load', ()=>{ applyFiltersAndUpdate(); renderRoutesList(); addUserLocationToMap(); try { map.resize(); } catch(e){} });

  // Locate button: center map on the user's current location (visible above collapsed sheet)
  const locateBtn = document.getElementById('locateBtn');
  function disableLocateButton(){ if (locateBtn){ locateBtn.classList.add('disabled'); locateBtn.setAttribute('disabled',''); } }
  if (locateBtn) {
    locateBtn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if (!('geolocation' in navigator)) { console.warn('Geolocation not available'); disableLocateButton(); return; }
      if (userLocationMarker) {
        try {
          const lnglat = userLocationMarker.getLngLat();
          map.flyTo({ center: [lnglat.lng, lnglat.lat], zoom: 14, speed: 1.2, curve: 1.4 });
        } catch(e){ addUserLocationToMap(); }
        return;
      }
      // Try to request location and fly to it
      navigator.geolocation.getCurrentPosition((pos)=>{ try { addUserLocationToMap(); } catch(e){} }, (err)=>{ console.warn('Geolocation error', err && err.message ? err.message : err); if (err && err.code === 1) disableLocateButton(); }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
    });
  }

  // bottom nav actions (consistent with other pages)
  document.querySelectorAll('.nav-item').forEach(btn=> btn.addEventListener('click', ()=>{
    const page = btn.getAttribute('data-page');
    if (page === 'profile') window.location.href = 'profile.html';
    else if (page === 'inicio') window.location.href = 'home.html';
    else if (page === 'favorites') window.location.href = 'favorites.html';
    else if (page === 'map') { /* already here */ }
  }));

})();