// data.js - Dishes loader and favorites utilities

// Compute the URL for `dishes.json` relative to this script file so pages work from / and /pages/
const _dataScript = document.currentScript || document.querySelector('script[src$="data.js"]');
const _dataBase = _dataScript ? new URL('.', _dataScript.src).href : window.location.origin + '/js/';
const _dishesUrl = new URL('dishes.json', _dataBase).href;

// Load dishes.json and cache in localStorage and in-memory
async function loadPlatos() {
    try {
        const res = await fetch(_dishesUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        try { localStorage.setItem('foodtales_platos', JSON.stringify(data)); } catch(e){ /* ignore storage errors */ }
        window._platosCache = data;
        return data;
    } catch (err) {
        console.error('Failed to load dishes.json from', _dishesUrl, err);
        // fallback to localStorage if available
        try {
            const cached = localStorage.getItem('foodtales_platos');
            if (cached) {
                const parsed = JSON.parse(cached);
                window._platosCache = parsed;
                return parsed;
            }
        } catch (e) { /* ignore */ }
        return [];
    }
}

// Expose loader globally for pages to await
window.loadPlatos = loadPlatos;

// Synchronous getter that reads from cache/localStorage for compatibility
function getPlatos() {
    if (window._platosCache) return window._platosCache;
    try {
        const cached = localStorage.getItem('foodtales_platos');
        if (cached) {
            window._platosCache = JSON.parse(cached);
            return window._platosCache;
        }
    } catch (e) { /* ignore parse errors */ }
    return window._platosCache || [];
}

// Función para guardar favoritos
function getFavoritos() {
    return JSON.parse(localStorage.getItem('foodtales_favoritos')) || [];
}

function addFavorito(platoId) {
    let favoritos = getFavoritos();
    if (!favoritos.includes(platoId)) {
        favoritos.push(platoId);
        localStorage.setItem('foodtales_favoritos', JSON.stringify(favoritos));
    }
}

function removeFavorito(platoId) {
    let favoritos = getFavoritos();
    favoritos = favoritos.filter(id => id !== platoId);
    localStorage.setItem('foodtales_favoritos', JSON.stringify(favoritos));
}

function isFavorito(platoId) {
    return getFavoritos().includes(platoId);
}