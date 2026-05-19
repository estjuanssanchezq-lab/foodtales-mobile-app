(async function(){
  const platosData = await (window.loadPlatos ? window.loadPlatos() : Promise.resolve(getPlatos()));

  

  // Map styles and theme handling
  const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
  const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';
  const savedTheme = localStorage.getItem('foodtales_theme') || 'dark';

  // Initialize an independent MapLibre map for the event using the saved theme
  const eventMap = new maplibregl.Map({
    container: 'event-map',
    style: savedTheme === 'light' ? STYLE_LIGHT : STYLE_DARK,
    center: [-74.062, 4.648],
    zoom: 12
  });

  // helper: create pin element with event class
  function createEventPinElement(){
    const el = document.createElement('div');
    el.className = 'map-marker event-pin';
    const pin = document.createElement('div'); pin.className = 'pin';
    el.appendChild(pin);
    return el;
  }

  // --- User location for event map ---
  let userLocationMarkerEvent = null;
  const userLocationSourceIdEvent = 'event-user-location-source';
  const userAccuracyLayerIdEvent = 'event-user-accuracy-layer';

  function metersPerPixel(lat, zoom) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom); }

  function addUserLocationToEventMap(){
    if (!('geolocation' in navigator)) { console.warn('Geolocation not available'); return; }
    navigator.geolocation.getCurrentPosition((pos)=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy || 0;

      if (!userLocationMarkerEvent) {
        const el = document.createElement('div'); el.className = 'user-location-marker';
        userLocationMarkerEvent = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(eventMap);
      } else { userLocationMarkerEvent.setLngLat([lng, lat]); }

      const point = { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { accuracy } };
      if (eventMap.getSource(userLocationSourceIdEvent)) { try { eventMap.getSource(userLocationSourceIdEvent).setData(point); } catch(e){} }
      else {
        try {
          eventMap.addSource(userLocationSourceIdEvent, { type:'geojson', data: point });
          eventMap.addLayer({ id: userAccuracyLayerIdEvent, type: 'circle', source: userLocationSourceIdEvent, paint: {
            'circle-color': 'rgba(66,133,244,0.12)', 'circle-stroke-color':'#ffffff', 'circle-stroke-width':2,
            'circle-radius': Math.max(8, accuracy / metersPerPixel(lat, eventMap.getZoom()))
          }});
        } catch(e){ console.warn('Failed to add event user location layer', e); }
      }

      function updateAccuracy(){ try { const pixels = Math.max(8, (accuracy||0)/metersPerPixel(lat, eventMap.getZoom())); if (eventMap.getLayer(userAccuracyLayerIdEvent)) eventMap.setPaintProperty(userAccuracyLayerIdEvent, 'circle-radius', pixels); } catch(e){} }
      eventMap.on('zoom', updateAccuracy); eventMap.on('move', updateAccuracy);

      try { eventMap.flyTo({ center: [lng, lat], zoom: 14, speed: 1.2, curve: 1.4 }); } catch(e){}
    }, (err)=>{ console.warn('Geolocation error', err && err.message ? err.message : err); }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
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
          <span class="map-popup-walk">🚶 ${ (p.distancia !== undefined && p.distancia !== null) ? (typeof p.distancia === 'number' ? p.distancia.toFixed(1) + ' km' : p.distancia) : (p.tiempoCaminando !== undefined && p.tiempoCaminando !== null ? p.tiempoCaminando + ' min' : '') }</span>
        </div>
        <div class="map-popup-actions"><button class="map-popup-btn">${(window.i18n && window.i18n.getLang && window.i18n.getLang() === 'en') ? 'View on Maps' : 'Ver en Maps'}</button></div>
      </div>
    `;
    const popup = new maplibregl.Popup({ offset:[0,-18], closeButton: false }).setDOMContent(node);
    const viewBtn = node.querySelector('.map-popup-btn');
    if (viewBtn) viewBtn.addEventListener('click', ()=>{
      // Open Google Maps directions for the restaurant coordinates in a new tab
      const lat = (p.lat || p.latitude || p.latitud || p.latitud === 0) ? (p.lat || p.latitude || p.latitud) : 4.648; // Bogotá fallback
      const lng = (p.lng || p.longitude || p.longitud || p.longitud === 0) ? (p.lng || p.longitude || p.longitud) : -74.062; // Bogotá fallback
      const outLat = typeof lat === 'string' ? lat : Number(lat);
      const outLng = typeof lng === 'string' ? lng : Number(lng);
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(outLat + ',' + outLng)}`;
      window.open(mapsUrl, '_blank');
    });
    return popup;
  }

  

  // Apply initial UI theme (body class and button text)
  function applyThemeToUI(theme){
    const themeBtn = document.getElementById('themeToggle');
    if (theme === 'light') { document.body.classList.remove('dark'); document.body.classList.add('light'); if (themeBtn) themeBtn.textContent = '☀️'; }
    else { document.body.classList.remove('light'); document.body.classList.add('dark'); if (themeBtn) themeBtn.textContent = '🌙'; }
  }
  applyThemeToUI(savedTheme);

  // Determine event participants: read exact participant objects from localStorage (written by event.html)
  const params = new URLSearchParams(window.location.search);
  const dishParam = params.get('dish');
  let eventPlatos = [];
  try {
    const raw = localStorage.getItem('foodtales_event_participants');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        if (typeof parsed[0] === 'string') {
          // array of ids -> resolve from platosData
          eventPlatos = platosData.filter(p => parsed.includes(p.id));
        } else if (typeof parsed[0] === 'object' && parsed[0].id) {
          // array of full objects supplied by event.html
          eventPlatos = parsed.map(obj => {
            // ensure lat/lng present: merge with platosData if available
            if ((obj.lat === null || obj.lat === undefined || obj.lng === null || obj.lng === undefined) && obj.id) {
              const found = platosData.find(x=>x.id === obj.id);
              return found ? Object.assign({}, found, obj) : obj;
            }
            return obj;
          });
        }
      }
    }
  } catch(e){ console.warn('Failed to parse event participants from localStorage', e); }

  // If a dish param is present but not in the list, try to add it from platosData
  if (dishParam) {
    if (!eventPlatos.find(p=>p.id === dishParam)) {
      const found = platosData.find(p=>p.id === dishParam);
      if (found) eventPlatos.unshift(found);
    }
  }

  // Fallback: if nothing found, try a default from platos.json
  if (!eventPlatos.length) {
    const fallback = platosData.find(p=>p.id === 'hamburguesa') || platosData[0];
    if (fallback) eventPlatos = [fallback];
  }

  // Marker management for multiple event platos
  let eventMarkers = [];
  const eventMarkerById = {};

  function addEventMarkers(){
    // remove previous markers
    eventMarkers.forEach(m=>{ try{ m.remove(); } catch(e){} });
    eventMarkers = [];
    Object.keys(eventMarkerById).forEach(k=>delete eventMarkerById[k]);

    eventPlatos.forEach(p => {
      const lat = parseFloat(p.lat || p.latitude || p.latitud);
      const lng = parseFloat(p.lng || p.longitude || p.longitud);
      if (!lat || !lng) return;
      const el = createEventPinElement();
      const marker = new maplibregl.Marker(el).setLngLat([lng, lat]).addTo(eventMap);
      const popup = createPopupForPlato(p);
      marker.setPopup(popup);
      // pin click: center and open popup (use marker's popup when possible)
      el.addEventListener('click', (e)=>{
        e.stopPropagation();
        try { eventMap.easeTo({ center:[lng, lat], zoom:14, offset:[0,-100] }); } catch(err){}
        try {
          if (marker && typeof marker.togglePopup === 'function') marker.togglePopup();
          else if (marker && typeof marker.getPopup === 'function' && marker.getPopup()) marker.getPopup().addTo(eventMap);
          else popup.addTo(eventMap);
        } catch(err) { try { popup.addTo(eventMap); } catch(e){} }
      });
      eventMarkers.push(marker);
      eventMarkerById[p.id] = { marker, popup, plato: p };
    });
  }

  // When map loads, add markers and center according to ?dish or fit bounds
  eventMap.on('load', ()=>{
    addEventMarkers();
    try {
      if (dishParam) {
        const target = eventPlatos.find(x=>x.id === dishParam);
        if (target && target.lat && target.lng) eventMap.easeTo({ center:[target.lng, target.lat], zoom:14, offset:[0,-100] });
      } else if (eventPlatos.length === 1) {
        try { eventMap.easeTo({ center:[eventPlatos[0].lng || eventPlatos[0].longitud, eventPlatos[0].lat || eventPlatos[0].latitud], zoom:13 }); } catch(e){}
      } else if (eventPlatos.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        eventPlatos.forEach(p=>{ if (p.lng && p.lat) bounds.extend([p.lng, p.lat]); });
        try { eventMap.fitBounds(bounds, { padding:80 }); } catch(e){}
      }
    } catch(e){}
    addUserLocationToEventMap(); try { eventMap.resize(); } catch(e){}
  });

  // Theme toggle handling (rebuild markers after style change)
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', ()=>{
    const current = document.body.classList.contains('light') ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem('foodtales_theme', next);
    applyThemeToUI(next);
    eventMap.setStyle(next === 'light' ? STYLE_LIGHT : STYLE_DARK);
    // Re-add markers after style switches, but DO NOT trigger geolocation here
    eventMap.once('styledata', ()=>{ addEventMarkers(); try { eventMap.resize(); } catch(e){} });
  });

  // Locate button handling for event map
  const locateBtnEvent = document.getElementById('locateBtn');
  function disableLocateButtonEvent(){ if (locateBtnEvent){ locateBtnEvent.classList.add('disabled'); locateBtnEvent.setAttribute('disabled',''); } }
  if (locateBtnEvent){
    locateBtnEvent.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if (!('geolocation' in navigator)) { console.warn('Geolocation not available'); disableLocateButtonEvent(); return; }
      if (userLocationMarkerEvent){
        try { const lnglat = userLocationMarkerEvent.getLngLat(); eventMap.flyTo({ center:[lnglat.lng, lnglat.lat], zoom:14, speed:1.2, curve:1.4 }); } catch(e){ addUserLocationToEventMap(); }
        return;
      }
      navigator.geolocation.getCurrentPosition((pos)=>{ try { addUserLocationToEventMap(); } catch(e){} }, (err)=>{ console.warn('Geolocation error', err && err.message ? err.message : err); if (err && err.code === 1) disableLocateButtonEvent(); }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
    });
  }

  // Render bottom-sheet list using the same eventPlatos
  const nearbyList = document.getElementById('nearbyList');
  function renderEventList(platos){
    if (!nearbyList) return;
    nearbyList.innerHTML = '';
    if (!platos || !platos.length) { nearbyList.innerHTML = '<div class="no-results">No hamburguesas en el evento</div>'; return; }
    platos.forEach(p => {
      const card = document.createElement('div');
      card.className = 'plato-card mini';
      card.dataset.id = p.id;
      // show only image, name, restaurant, rating, price and distance (km)
      const distText = (p.distancia !== undefined && p.distancia !== null)
        ? (typeof p.distancia === 'number' ? `${p.distancia.toFixed(1)} km` : `${p.distancia}`)
        : (p.tiempoCaminando !== undefined && p.tiempoCaminando !== null ? `${p.tiempoCaminando} min` : '');
      card.innerHTML = `
        <img class="plato-img" src="${p.imagen || p.imagenUrl || ''}" alt="${p.nombre}" onerror="this.src='https://placehold.co/120x80?text=${encodeURIComponent(p.nombre)}'"/>
        <div class="plato-info">
          <div class="plato-nombre">${p.nombre}</div>
          <div class="plato-restaurante">${p.restaurante || ''}</div>
          <div class="plato-stars">${p.estrellas ? '⭐'.repeat(Math.floor(p.estrellas)) + ' ' + p.estrellas : ''}</div>
          <div class="plato-details"><span class="meta-price">💰 $${(p.precio||0).toLocaleString()} COP</span><span class="meta-distance">🚶 ${distText}</span></div>
        </div>
      `;
      // clicking centers the map to the plate location (preview-only behavior)
      card.addEventListener('click', ()=>{
        const lat = p.lat || p.latitude || p.latitud;
        const lng = p.lng || p.longitude || p.longitud;
        if (lat && lng) try { eventMap.easeTo({ center:[lng,lat], zoom:14, offset:[0,-120] }); } catch(e){}
        const sheet = document.getElementById('bottomSheet');
        if (sheet) {
          // Collapse immediately
          sheet.classList.remove('expanded'); sheet.classList.add('collapsed'); sheet.style.height = '';
          // After collapse transition finishes, open the popup for this plato
          const openPopup = ()=>{
            const entry = eventMarkerById[p.id];
            if (!entry) return false;
            try {
              if (entry.marker && typeof entry.marker.togglePopup === 'function') { entry.marker.togglePopup(); return true; }
              if (entry.marker && typeof entry.marker.getPopup === 'function' && entry.marker.getPopup()) { entry.marker.getPopup().addTo(eventMap); return true; }
              if (entry.popup) { entry.popup.addTo(eventMap); return true; }
            } catch(e){}
            return false;
          };
          // Wait for transitionend on the sheet (height) or fallback timeout
          let done = false;
          const onEnd = (ev)=>{ if (ev && ev.target !== sheet) return; if (done) return; done = true; sheet.removeEventListener('transitionend', onEnd); if (!openPopup()) {
              // try again shortly if marker not yet registered
              setTimeout(()=>{ openPopup(); }, 250);
            }
          };
          sheet.addEventListener('transitionend', onEnd);
          // fallback if transitionend doesn't fire
          setTimeout(()=>{ if (!done) onEnd(); }, 400);
        } else {
          // no sheet element: open popup immediately from marker if possible
          const entry = eventMarkerById[p.id];
          try {
            if (entry && entry.marker && typeof entry.marker.togglePopup === 'function') entry.marker.togglePopup();
            else if (entry && entry.marker && typeof entry.marker.getPopup === 'function' && entry.marker.getPopup()) entry.marker.getPopup().addTo(eventMap);
            else if (entry && entry.popup) entry.popup.addTo(eventMap);
          } catch(e){}
        }
      });
      nearbyList.appendChild(card);
    });
  }

  renderEventList(eventPlatos);

  // Bottom-sheet drag-to-expand/collapse (pointer events)
  (function(){
    const sheet = document.getElementById('bottomSheet');
    const sheetHandle = document.getElementById('sheetHandle');
    if (!sheet || !sheetHandle) return;

    const COLLAPSED_H = 160;
    function getExpandedH(){ return Math.round(window.innerHeight * 0.66); }
    let dragging = false;
    let startY = 0;
    let startH = 0;
    let activePointer = null;

    sheetHandle.style.touchAction = 'none';

    sheetHandle.addEventListener('pointerdown', (ev)=>{
      dragging = true;
      activePointer = ev.pointerId;
      startY = ev.clientY;
      startH = sheet.offsetHeight;
      try { sheetHandle.setPointerCapture(activePointer); } catch(e){}
      sheet.style.transition = 'height 0s';
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
      sheetHandle.classList && sheetHandle.classList.remove('dragging');
      const currentH = sheet.offsetHeight;
      const threshold = (COLLAPSED_H + getExpandedH()) / 2;
      if (Math.abs(currentH - startH) < 8) {
        if (sheet.classList.contains('collapsed')) { sheet.classList.remove('collapsed'); sheet.classList.add('expanded'); }
        else { sheet.classList.remove('expanded'); sheet.classList.add('collapsed'); }
      } else if (currentH >= threshold) {
        sheet.classList.remove('collapsed'); sheet.classList.add('expanded'); sheet.style.height = '';
      } else {
        sheet.classList.remove('expanded'); sheet.classList.add('collapsed'); sheet.style.height = '';
      }
      activePointer = null;
    }

    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);
    window.addEventListener('resize', ()=>{ if (sheet.classList.contains('expanded')) sheet.style.height = ''; });
  })();

  // Collapse sheet when clicking map outside
  eventMap.getContainer().addEventListener('click', (ev)=>{
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;
    if (sheet.classList.contains('collapsed')) return;
    if (sheet.contains(ev.target)) return;
    sheet.classList.remove('expanded'); sheet.classList.add('collapsed'); sheet.style.height = '';
  });

})();
