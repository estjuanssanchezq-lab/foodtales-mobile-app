const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [-74.0721, 4.7110], // Bogotá
  zoom: 12
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');