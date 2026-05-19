(async function(){
  const platosData = await (window.loadPlatos ? window.loadPlatos() : Promise.resolve(getPlatos()));

  // Find the hamburguesa dish (event item)
  const eventoPlato = platosData.find(p=>p.id === 'hamburguesa');
  if (!eventoPlato) return console.warn('No se encontró el plato de evento: hamburguesa');

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
    const popup = new maplibregl.Popup({ offset:[0,-18], closeButton: false }).setDOMContent(node);
    const viewBtn = node.querySelector('.map-popup-btn');
    if (viewBtn) viewBtn.addEventListener('click', ()=>{ window.location.href = `dish-detail.html?dish=${p.id}`; });
    return popup;
  }

  

  // Apply initial UI theme (body class and button text)
  function applyThemeToUI(theme){
    const themeBtn = document.getElementById('themeToggle');
    if (theme === 'light') { document.body.classList.remove('dark'); document.body.classList.add('light'); if (themeBtn) themeBtn.textContent = '☀️'; }
    else { document.body.classList.remove('light'); document.body.classList.add('dark'); if (themeBtn) themeBtn.textContent = '🌙'; }
  }
  applyThemeToUI(savedTheme);

  // Marker management (recreate after style changes)
  let marker = null;
  let popup = null;
  function addEventMarker(){
    if (marker) try { marker.remove(); } catch(e){}
    const el = createEventPinElement();
    marker = new maplibregl.Marker(el).setLngLat([eventoPlato.lng, eventoPlato.lat]).addTo(eventMap);
    popup = createPopupForPlato(eventoPlato);
    marker.setPopup(popup);
    el.addEventListener('click', (e)=>{ e.stopPropagation(); eventMap.easeTo({ center:[eventoPlato.lng,eventoPlato.lat], zoom:14, offset:[0,-100] }); try { marker.togglePopup(); } catch(err){ popup.addTo(eventMap); } });
  }

  eventMap.on('load', ()=>{ addEventMarker(); try { eventMap.easeTo({ center:[eventoPlato.lng,eventoPlato.lat], zoom:13 }); } catch(e){} });

  // Theme toggle handling (rebuild marker after style change)
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', ()=>{
    const current = document.body.classList.contains('light') ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem('foodtales_theme', next);
    applyThemeToUI(next);
    eventMap.setStyle(next === 'light' ? STYLE_LIGHT : STYLE_DARK);
    eventMap.once('styledata', ()=>{ addEventMarker(); });
  });

  // Render event list (only hamburguesa)
  const nearbyList = document.getElementById('nearbyList');
  function renderEventList(p){
    nearbyList.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'plato-card mini';
    card.innerHTML = `
      <img class="plato-img" src="${p.imagen}" alt="${p.nombre}" onerror="this.src='https://placehold.co/120x80?text=${encodeURIComponent(p.nombre)}'"/>
      <div class="plato-info">
        <div class="plato-nombre">${p.nombre}</div>
        <div class="plato-restaurante">${p.restaurante}</div>
        <div class="plato-stars">${'⭐'.repeat(Math.floor(p.estrellas))} ${p.estrellas}</div>
        <div class="plato-details"><span>📍 ${p.direccion || 'Bogotá'}</span><span>💰 ${p.moneda || 'COP'} ${p.precio.toLocaleString()}</span><span>🚶‍♂️ ${p.tiempoCaminando} min</span></div>
      </div>
      <div class="plato-actions"><button class="btn-small ver-detalles">Ver Detalles</button></div>
    `;
    // clicking centers the map to the plate location (preview-only behavior)
    card.addEventListener('click', ()=>{ eventMap.easeTo({ center:[p.lng,p.lat], zoom:14, offset:[0,-120] }); document.getElementById('bottomSheet').classList.add('collapsed'); });
    const btn = card.querySelector('.ver-detalles');
    if (btn) btn.addEventListener('click', (e)=>{ e.stopPropagation(); window.location.href = `dish-detail.html?dish=${p.id}`; });
    nearbyList.appendChild(card);
  }

  renderEventList(eventoPlato);

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
