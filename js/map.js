(async function(){
  const platosData = await (window.loadPlatos ? window.loadPlatos() : Promise.resolve(getPlatos()));

  const categories = ['All','Breakfast','Lunch','Desserts','Juices','Fast Food','Traditional'];
  const categoryMap = {
    'All': platosData.map(p=>p.id),
    'Breakfast': ['arepa'],
    'Lunch': ['bandeja','ajiaco','sancocho'],
    'Desserts': [],
    'Juices': [],
    'Fast Food': ['hamburguesa'],
    'Traditional': ['ajiaco','bandeja','sancocho']
  };

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

  let selectedCategory = 'All';
  let currentMarkers = [];
  let currentRoute = null;
  let currentTheme = 'dark';

  // create chips with emojis
  const categoryIcons = {
    'All': '🍽️',
    'Breakfast': '🍳',
    'Lunch': '🍲',
    'Desserts': '🍰',
    'Juices': '🧃',
    'Fast Food': '🍔',
    'Traditional': '🇨🇴'
  };

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.category = cat;
    btn.innerHTML = ` <span class="chip-emoji">${categoryIcons[cat]||''}</span><span class="chip-label">${cat}</span>`;
    if (cat === 'All') btn.classList.add('active');
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      selectedCategory = cat;
      applyFiltersAndUpdate();
    });
    chipsWrapper.appendChild(btn);
  });

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
    map.once('styledata', ()=>{ if (currentRoute) startRoute(currentRoute); else applyFiltersAndUpdate(); });
  });

  function clearMarkers(){ currentMarkers.forEach(m=>m.remove()); currentMarkers = []; }

  function createPinElement(text){
    const el = document.createElement('div');
    el.className = 'map-marker';
    const pin = document.createElement('div');
    pin.className = 'pin';
    if (text) pin.textContent = text;
    el.appendChild(pin);
    return el;
  }

  function showPlatoPopup(p){
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
    // Popup originates at the pin; no close button (user closes by tapping outside)
    const popup = new maplibregl.Popup({ offset: [0, -18], closeButton: false }).setDOMContent(node).setLngLat([p.lng,p.lat]).addTo(map);
    const viewBtn = node.querySelector('.map-popup-btn');
    if (viewBtn) viewBtn.addEventListener('click', ()=> { window.location.href = `dish-detail.html?dish=${p.id}`; });
  }

  function addMarkersForPlatos(platosArray){
    clearMarkers();
    platosArray.forEach(p=>{
      if (!p.lat || !p.lng) return;
      const el = createPinElement();
      el.addEventListener('click', (e)=>{ e.stopPropagation(); showPlatoPopup(p); map.easeTo({ center:[p.lng,p.lat], zoom:14, offset:[0,-100] }); });
      const marker = new maplibregl.Marker(el).setLngLat([p.lng,p.lat]).addTo(map);
      currentMarkers.push(marker);
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
      // make the entire card clickable (tap anywhere to move/center the map only)
      card.addEventListener('click', ()=>{ map.easeTo({ center:[p.lng,p.lat], zoom:14, offset:[0,-120]}); sheet.classList.remove('expanded'); sheet.classList.add('collapsed'); });
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
      el.addEventListener('click', ()=>{ showPlatoPopup(p); map.easeTo({center:[p.lng,p.lat], zoom:14, offset:[0,-100]}); });
      const marker = new maplibregl.Marker(el).setLngLat([p.lng,p.lat]).addTo(map);
      currentMarkers.push(marker);
    });
    if (coords.length > 1){
      const srcId = `route-src-${route.id}`;
      const lineId = `route-line-${route.id}`;
      map.addSource(srcId, { type:'geojson', data: { type:'Feature', geometry:{ type:'LineString', coordinates: coords } } });
      map.addLayer({ id: lineId, type: 'line', source: srcId, layout:{'line-join':'round','line-cap':'round'}, paint:{'line-color':'#ffb347','line-width':4,'line-opacity':0.95} });
      const bounds = coords.reduce((b,c)=> b.extend(c), new maplibregl.LngLatBounds(coords[0],coords[0]));
      map.fitBounds(bounds, { padding: 80 });
    } else if (coords.length === 1) { map.easeTo({ center: coords[0], zoom: 14 }); }
    currentRoute = route;
    sheet.classList.add('collapsed');
  }

  function applyFiltersAndUpdate(){
    const flavor = parseInt(flavorRange.value || 5, 10);
    const tMax = parseInt(timeMax.value || 60, 10);
    const pMax = parseInt(priceMax.value || 50000, 10);
    const dMax = parseFloat(distanceMax.value || 10);
    const rating = parseFloat(minRating.value || 0);
    let filtered = platosData.filter(p=>{
      if (selectedCategory !== 'All'){
        const allowed = categoryMap[selectedCategory] || [];
        if (!allowed.includes(p.id)) return false;
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

  map.on('load', ()=>{ applyFiltersAndUpdate(); renderRoutesList(); });

  // bottom nav actions (consistent with other pages)
  document.querySelectorAll('.nav-item').forEach(btn=> btn.addEventListener('click', ()=>{
    const page = btn.getAttribute('data-page');
    if (page === 'profile') window.location.href = 'profile.html';
    else if (page === 'inicio') window.location.href = 'home.html';
    else if (page === 'favorites') window.location.href = 'favorites.html';
    else if (page === 'map') { /* already here */ }
  }));

})();