import 'leaflet/dist/leaflet.css';
import './style.css';
import L from 'leaflet';
import type { Checkpoint, ImagePoint, LatLng, Project } from './types';
import { saveProject, listProjects } from './storage';
import { homography, imageToGeo } from './math';
import { calculateRoute } from './services';
import { gpxFor } from './gpx';
import { mapyRouteUrl } from './mapy';

type Step = 'map' | 'points' | 'route';
type Calibration = 'idle' | 'photo' | 'osm' | 'done';
type Pointer = { x: number; y: number };
const el = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector(selector) as T;
const id = () => crypto.randomUUID();
const newProject = (): Project => ({
  id: id(), name: 'Nowa pętla', createdAt: Date.now(), updatedAt: Date.now(),
  controlPoints: [], checkpoints: [], opacity: 0.55,
  imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 }
});
let project = newProject();
let map: L.Map;
let markers: L.Layer[] = [];
let step: Step = 'map';
let calibration: Calibration = 'idle';
let pendingImage: ImagePoint | undefined;
let previewPhoto = false;
let firstId = 'auto';
let lastId = 'auto';
let photoMode = false;
let pointerStart: Pointer | undefined;
let gestureStart: { distance: number; angle: number; center: Pointer; x: number; y: number; scale: number; rotation: number } | undefined;
const pointers = new Map<number, Pointer>();
let moved = false;

function createApp() {
  el('#app').innerHTML = `
    <header><div><span class="eyebrow">ERNO HARPAGAN</span><h1>Harpagan Route Planner</h1></div><button id="theme" class="icon" aria-label="Zmień motyw">☾</button></header>
    <main>
      <section class="hero">
        <p>Dodaj zdjęcie mapy, skalibruj je i zaplanuj pieszą trasę.</p>
        <div class="actions"><button id="new" class="primary">＋ Nowy projekt</button><button id="open" class="secondary">Otwórz zapisany</button></div>
        <label>Nazwa projektu <input id="project-name" type="text" value="" autocomplete="off"></label>
        <div class="actions photo-actions">
          <button id="camera" class="primary">📷 Z aparatu</button><button id="gallery" class="secondary">🖼 Z galerii</button>
          <input id="camera-input" type="file" accept="image/*" capture="environment" hidden>
          <input id="gallery-input" type="file" accept="image/*" hidden>
        </div>
      </section>
      <section class="workspace">
        <nav class="steps"><button data-step="map">1 Mapa</button><button data-step="points">2 Punkty</button><button data-step="route">3 Trasa</button></nav>
        <div class="map-wrap" id="map-wrap">
          <div id="map"></div><div id="photo-layer"><img id="photo-image" alt="Zdjęcie mapy"></div>
          <div id="reticle" aria-hidden="true"><span></span></div>
          <div id="map-help" role="status"></div>
          <div id="map-actions"></div>
        </div>
        <div class="controls"><div id="map-controls"></div><div id="points-controls" hidden></div><div id="route-controls" hidden></div></div>
      </section>
      <footer><small>© OpenStreetMap contributors · Trasy: Valhalla / OSRM / geometria awaryjna</small></footer>
    </main>`;
  map = L.map('map', { zoomControl: false }).setView([54.35, 18.65], 11);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(map);
  map.on('click', e => {
    if (step === 'points' && calibration === 'done' && !photoMode) addCheckpoint({ lat: e.latlng.lat, lon: e.latlng.lng });
  });
  const saved = localStorage.getItem('harpagan-theme');
  if (saved === 'dark') document.body.classList.add('dark');
  el('#theme').onclick = () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('harpagan-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  };
  el('#new').onclick = () => { project = newProject(); resetEditor(); refresh(); save(); };
  el('#open').onclick = openProject;
  el('#camera').onclick = () => el<HTMLInputElement>('#camera-input').click();
  el('#gallery').onclick = () => el<HTMLInputElement>('#gallery-input').click();
  el<HTMLInputElement>('#camera-input').onchange = e => loadImage((e.target as HTMLInputElement).files?.[0]);
  el<HTMLInputElement>('#gallery-input').onchange = e => loadImage((e.target as HTMLInputElement).files?.[0]);
  el<HTMLInputElement>('#project-name').onchange = e => {
    project.name = (e.target as HTMLInputElement).value.trim() || 'Nowa pętla'; save();
  };
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
    step = (button as HTMLElement).dataset.step as Step;
    refresh();
  }));
  const layer = el('#photo-layer');
  layer.addEventListener('pointerdown', photoPointerDown);
  layer.addEventListener('pointermove', photoPointerMove);
  layer.addEventListener('pointerup', photoPointerUp);
  layer.addEventListener('pointercancel', photoPointerUp);
  layer.addEventListener('wheel', e => {
    if (!canMovePhoto()) return;
    e.preventDefault();
    project.imageTransform.scale = clamp(project.imageTransform.scale * Math.exp(-e.deltaY * 0.001), 0.2, 8);
    positionPhoto(); save();
  }, { passive: false });
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
    p => map.setView([p.coords.latitude, p.coords.longitude], 15),
    () => {}, { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
  );
  refresh();
}

function resetEditor() {
  step = 'map'; calibration = 'idle'; pendingImage = undefined;
  previewPhoto = false; photoMode = false; firstId = 'auto'; lastId = 'auto';
}

function refresh() {
  el<HTMLInputElement>('#project-name').value = project.name;
  document.querySelectorAll('[data-step]').forEach(button =>
    button.classList.toggle('active', (button as HTMLElement).dataset.step === step));
  el('#map-controls').hidden = step !== 'map';
  el('#points-controls').hidden = step !== 'points';
  el('#route-controls').hidden = step !== 'route';
  renderMapControls();
  renderPointControls();
  renderRouteControls();
  renderLayers();
  drawMarkers();
}

function renderMapControls() {
  const count = project.controlPoints.length;
  const status = calibration === 'done' ? 'Kalibracja zakończona' :
    count < 4 ? `${count} z minimum 4 par punktów` : `${count} par punktów — możesz zakończyć`;
  el('#map-controls').innerHTML = `
    <div class="card">
      <h2>Dopasuj mapę</h2>
      <p class="muted">Przesuwaj całą warstwę pod stałym celownikiem. Wybierz charakterystyczne miejsca rozłożone po całym zdjęciu.</p>
      <p class="status">${status}</p>
      <div class="button-row"><button id="start-calibration" class="primary">${calibration === 'idle' ? 'Rozpocznij kalibrację' : 'Kalibruj dalej'}</button>
      <button id="undo-calibration" class="secondary" ${count ? '' : 'disabled'}>Cofnij ostatni punkt</button>
      <button id="reset-calibration" class="ghost">Wyczyść kalibrację</button></div>
    </div>`;
  el<HTMLButtonElement>('#start-calibration').onclick = () => {
    if (!project.image) { alert('Najpierw dodaj zdjęcie mapy.'); return; }
    calibration = 'photo'; previewPhoto = false; step = 'map'; refresh();
  };
  el<HTMLButtonElement>('#undo-calibration').onclick = () => {
    project.controlPoints.pop(); project.route = undefined;
    calibration = 'photo'; pendingImage = undefined; previewPhoto = false; refresh(); save();
  };
  el<HTMLButtonElement>('#reset-calibration').onclick = () => {
    project.controlPoints = []; project.route = undefined;
    pendingImage = undefined; calibration = project.image ? 'photo' : 'idle';
    previewPhoto = false; refresh(); save();
  };
}

function renderLayers() {
  const hasPhoto = Boolean(project.image);
  const photoStage = step === 'map' && calibration === 'photo';
  const osmStage = step === 'map' && calibration === 'osm';
  const photoVisible = hasPhoto && ((step === 'map' && calibration === 'idle') || photoStage || (osmStage && previewPhoto) || (step === 'points' && photoMode));
  const photoInteractive = photoStage || (step === 'points' && photoMode);
  const img = el<HTMLImageElement>('#photo-image');
  if (project.image && img.src !== project.image) img.src = project.image;
  img.style.display = photoVisible ? 'block' : 'none';
  const layer = el('#photo-layer');
  layer.style.display = photoVisible ? 'block' : 'none';
  layer.style.pointerEvents = photoInteractive ? 'auto' : 'none';
  el('#map').style.visibility = photoVisible ? 'hidden' : 'visible';
  const reticle = el('#reticle');
  reticle.hidden = !photoStage && !osmStage;
  const mapInput = !photoVisible && !photoStage;
  map.dragging[mapInput ? 'enable' : 'disable']();
  map.touchZoom[mapInput ? 'enable' : 'disable']();
  map.doubleClickZoom[mapInput ? 'enable' : 'disable']();
  positionPhoto();
  renderMapActions();
  const help = el('#map-help');
  help.textContent = photoStage
    ? 'Przesuń i powiększ zdjęcie. Ustaw wybrane miejsce pod celownikiem.'
    : osmStage && previewPhoto
      ? 'Podgląd zdjęcia. Wróć do OSM, aby ustawić odpowiadające miejsce.'
      : osmStage
        ? 'Przesuń i powiększ OSM. Ustaw to samo miejsce pod celownikiem.'
        : step === 'points' && photoMode
          ? 'Dotknij punktu na zdjęciu, aby dodać PK.'
          : step === 'points' ? 'Dotknij mapy, aby dodać PK.' : '';
  help.hidden = !help.textContent;
  if (mapInput) setTimeout(() => map.invalidateSize(), 0);
}

function renderMapActions() {
  const area = el('#map-actions');
  area.innerHTML = '';
  const button = (label: string, action: () => void, secondary = false) => {
    const b = document.createElement('button');
    b.className = secondary ? 'secondary' : 'primary';
    b.textContent = label; b.onclick = action; area.append(b); return b;
  };
  if (step !== 'map' || !project.image) return;
  if (calibration === 'idle' || calibration === 'done') {
    button('Obróć zdjęcie ↶', () => rotate(-5), true);
    button('Obróć zdjęcie ↷', () => rotate(5), true);
    button('Rozpocznij kalibrację', () => { calibration = 'photo'; refresh(); });
    return;
  }
  if (calibration === 'photo') {
    button('↶ 5°', () => rotate(-5), true);
    button('↷ 5°', () => rotate(5), true);
    button('Zablokuj punkt na zdjęciu', () => {
      const point = imageAtScreenCenter();
      if (!point) { alert('Ustaw zdjęcie pod celownikiem.'); return; }
      pendingImage = point;
      calibration = 'osm'; previewPhoto = false; refresh();
    });
  } else if (calibration === 'osm') {
    button(previewPhoto ? 'Wróć do OSM' : 'Pokaż zdjęcie', () => {
      previewPhoto = !previewPhoto; renderLayers();
    }, true);
    button('Wróć do zdjęcia', () => { calibration = 'photo'; previewPhoto = false; refresh(); }, true);
    if (!previewPhoto) button('Potwierdź punkt na OSM', () => {
      if (!pendingImage) return;
      const geo = map.getCenter();
      project.controlPoints.push({ image: pendingImage, geo: { lat: geo.lat, lon: geo.lng } });
      pendingImage = undefined; calibration = 'photo'; previewPhoto = false;
      refresh(); save();
    });
  }
  if (project.controlPoints.length >= 4 && calibration === 'photo')
    button('Zakończ kalibrację', finishCalibration, true);
}

function finishCalibration() {
  try { homography(project.controlPoints); }
  catch { alert('Punkty są zbyt blisko siebie lub w jednej linii. Dodaj punkty w innych częściach mapy.'); return; }
  calibration = 'done'; step = 'points'; photoMode = true; refresh(); save();
}

function rotate(degrees: number) {
  project.imageTransform.rotation += degrees;
  positionPhoto(); save();
}

function positionPhoto() {
  const img = el<HTMLImageElement>('#photo-image');
  const t = project.imageTransform;
  img.style.transform = `translate(-50%, -50%) translate(${t.x}px, ${t.y}px) rotate(${t.rotation}deg) scale(${t.scale})`;
}

function canMovePhoto() { return calibration === 'photo' && step === 'map'; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function measureGesture() {
  const [a, b] = [...pointers.values()];
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  };
}
function photoPointerDown(e: PointerEvent) {
  if (!canMovePhoto() && !(step === 'points' && photoMode)) return;
  e.preventDefault();
  el('#photo-layer').setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) { pointerStart = { x: e.clientX, y: e.clientY }; moved = false; gestureStart = undefined; }
  if (pointers.size === 2 && canMovePhoto()) {
    const g = measureGesture(), t = project.imageTransform;
    gestureStart = { ...g, x: t.x, y: t.y, scale: t.scale, rotation: t.rotation };
    pointerStart = undefined; moved = true;
  }
}
function photoPointerMove(e: PointerEvent) {
  const old = pointers.get(e.pointerId);
  if (!old) return;
  e.preventDefault();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!canMovePhoto()) return;
  const t = project.imageTransform;
  if (pointers.size === 2 && gestureStart) {
    const g = measureGesture();
    const scale = clamp(gestureStart.scale * g.distance / Math.max(gestureStart.distance, 1), 0.2, 8);
    t.scale = scale;
    t.rotation = gestureStart.rotation + (g.angle - gestureStart.angle) * 180 / Math.PI;
    t.x = gestureStart.x + g.center.x - gestureStart.center.x;
    t.y = gestureStart.y + g.center.y - gestureStart.center.y;
  } else if (pointers.size === 1) {
    t.x += e.clientX - old.x; t.y += e.clientY - old.y;
  }
  if (pointerStart && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 6) moved = true;
  positionPhoto();
}
function photoPointerUp(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return;
  const wasTap = !moved && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (pointers.size === 1) { gestureStart = undefined; pointerStart = [...pointers.values()][0]; }
  if (!pointers.size) { gestureStart = undefined; pointerStart = undefined; save(); }
  if (wasTap && step === 'points' && photoMode && calibration === 'done') {
    try {
      const p = imageAtScreen({ x: e.clientX, y: e.clientY });
      if (p) addCheckpoint(imageToGeo(p, homography(project.controlPoints)));
    } catch { alert('Kalibracja jest nieprawidłowa. Spróbuj dodać inne punkty kalibracyjne.'); }
  }
}

function imageAtScreenCenter(): ImagePoint | undefined {
  const rect = el('#map-wrap').getBoundingClientRect();
  return imageAtScreen({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
}
function imageAtScreen(screen: Pointer): ImagePoint | undefined {
  const img = el<HTMLImageElement>('#photo-image');
  const rect = el('#map-wrap').getBoundingClientRect();
  const t = project.imageTransform;
  const dx = screen.x - (rect.left + rect.width / 2 + t.x);
  const dy = screen.y - (rect.top + rect.height / 2 + t.y);
  const angle = -t.rotation * Math.PI / 180;
  const x = (Math.cos(angle) * dx - Math.sin(angle) * dy) / t.scale + img.offsetWidth / 2;
  const y = (Math.sin(angle) * dx + Math.cos(angle) * dy) / t.scale + img.offsetHeight / 2;
  if (x < 0 || y < 0 || x > img.offsetWidth || y > img.offsetHeight) return;
  return { x: x / img.offsetWidth * (project.imageWidth ?? img.naturalWidth),
    y: y / img.offsetHeight * (project.imageHeight ?? img.naturalHeight) };
}

async function loadImage(file?: File) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Wybierz plik obrazu.'); return; }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const max = 2400, ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) throw Error('Brak obsługi Canvas');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    project.image = canvas.toDataURL('image/jpeg', 0.85);
    project.imageWidth = canvas.width; project.imageHeight = canvas.height;
    project.imageTransform = { x: 0, y: 0, scale: 1, rotation: 0 };
    project.controlPoints = []; project.route = undefined;
    calibration = 'idle'; pendingImage = undefined; step = 'map';
    refresh(); save();
  } catch {
    alert('Nie można odczytać zdjęcia. Wybierz inny plik JPG lub PNG.');
  }
}

function addCheckpoint(geo: LatLng) {
  const number = String(project.checkpoints.filter(p => p.kind === 'checkpoint').length + 1);
  project.checkpoints.push({ id: id(), number, geo, kind: 'checkpoint' });
  project.route = undefined; refresh(); save();
}
function setBase() {
  const use = (geo: LatLng) => {
    project.base = geo;
    project.checkpoints = project.checkpoints.filter(p => p.kind !== 'base');
    project.checkpoints.unshift({ id: id(), number: '', geo, kind: 'base' });
    refresh(); save();
  };
  if (!navigator.geolocation) { const p = map.getCenter(); use({ lat: p.lat, lon: p.lng }); return; }
  navigator.geolocation.getCurrentPosition(
    p => use({ lat: p.coords.latitude, lon: p.coords.longitude }),
    () => { const p = map.getCenter(); use({ lat: p.lat, lon: p.lng }); alert('GPS niedostępny. Bazę ustawiono w środku mapy.'); },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
  );
}
function renderPointControls() {
  const cps = project.checkpoints.filter(p => p.kind === 'checkpoint');
  el('#points-controls').innerHTML = `
    <div class="card"><h2>Punkty kontrolne</h2>
      <p class="muted">Widok: ${photoMode ? 'zdjęcie' : 'OSM'}. Dotknij miejsca, aby dodać PK.</p>
      <div class="button-row"><button id="points-view" class="secondary">${photoMode ? 'Pokaż OSM' : 'Pokaż zdjęcie'}</button>
      <button id="set-base" class="primary">Tu jest baza (GPS)</button></div>
      <div id="checkpoint-list"></div></div>`;
  el<HTMLButtonElement>('#points-view').onclick = () => { photoMode = !photoMode; refresh(); };
  el<HTMLButtonElement>('#set-base').onclick = setBase;
  const list = el('#checkpoint-list');
  if (!cps.length) { list.innerHTML = '<p class="muted">Nie dodano jeszcze PK.</p>'; return; }
  cps.forEach(p => {
    const row = document.createElement('div'); row.className = 'checkpoint';
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = p.number;
    const input = document.createElement('input'); input.type = 'text'; input.value = p.number; input.setAttribute('aria-label', 'Numer PK');
    input.onchange = () => { p.number = input.value.trim() || p.number; project.route = undefined; refresh(); save(); };
    const first = document.createElement('label'), firstRadio = document.createElement('input');
    firstRadio.type = 'radio'; firstRadio.name = 'first'; firstRadio.checked = firstId === p.id;
    firstRadio.onchange = () => { firstId = p.id; project.route = undefined; save(); };
    first.append(firstRadio, ' pierwszy');
    const last = document.createElement('label'), lastRadio = document.createElement('input');
    lastRadio.type = 'radio'; lastRadio.name = 'last'; lastRadio.checked = lastId === p.id;
    lastRadio.onchange = () => { lastId = p.id; project.route = undefined; save(); };
    last.append(lastRadio, ' ostatni');
    const del = document.createElement('button'); del.className = 'icon'; del.textContent = '×'; del.setAttribute('aria-label', 'Usuń PK');
    del.onclick = () => { project.checkpoints = project.checkpoints.filter(q => q.id !== p.id); project.route = undefined; refresh(); save(); };
    row.append(badge, input, first, last, del); list.append(row);
  });
}

function renderRouteControls() {
  el('#route-controls').innerHTML = `
    <div class="card"><h2>Planowanie trasy</h2>
      <p class="muted">Baza → pierwszy PK → pozostałe → ostatni PK → baza</p>
      <div class="button-row"><button id="calculate" class="primary">Oblicz trasę</button>
      <button id="gpx" class="secondary">Pobierz GPX</button>
      <button id="mapy" class="secondary">Otwórz Mapy.com</button></div>
      <div id="route-summary"></div></div>`;
  el<HTMLButtonElement>('#calculate').onclick = calculate;
  el<HTMLButtonElement>('#gpx').onclick = downloadGpx;
  el<HTMLButtonElement>('#mapy').onclick = openMapy;
  const route = project.route;
  if (!route) return;
  const box = el('#route-summary');
  box.className = 'route-result';
  const order = document.createElement('strong');
  order.textContent = route.order.map(p => p.kind === 'base' ? 'Baza' : `PK ${p.number}`).join(' → ');
  const summary = document.createElement('span');
  summary.textContent = `${(route.totalDistance / 1000).toFixed(2)} km · silnik: ${route.engine}`;
  box.append(order, summary);
  if (route.warning) { const warning = document.createElement('p'); warning.className = 'warning'; warning.textContent = route.warning; box.append(warning); }
}
async function calculate() {
  if (!project.base) { alert('Ustaw bazę przed obliczeniem trasy.'); return; }
  const cps = project.checkpoints.filter(p => p.kind === 'checkpoint');
  if (!cps.length) { alert('Dodaj przynajmniej jeden PK.'); return; }
  const button = el<HTMLButtonElement>('#calculate');
  button.disabled = true; button.textContent = 'Obliczanie…';
  try {
    project.route = await calculateRoute(project.base, cps, cps.find(p => p.id === firstId), cps.find(p => p.id === lastId));
    refresh(); save();
  } catch { alert('Nie udało się obliczyć trasy. Spróbuj ponownie.'); button.disabled = false; button.textContent = 'Oblicz trasę'; }
}
function downloadGpx() {
  if (!project.route || !project.base) { alert('Najpierw oblicz trasę.'); return; }
  const blob = new Blob([gpxFor(project, project.route.order, project.route.geometry)], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `${project.name.replace(/[^a-zA-Z0-9ąćęłńóśźż_-]+/gi, '-')}.gpx`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function openMapy() {
  if (!project.route || !project.base) { alert('Najpierw oblicz trasę.'); return; }
  const points = project.route.order.filter(p => p.kind === 'checkpoint');
  if (points.length > 15) alert('Mapy.com ma limit punktów pośrednich. Otwarta zostanie pierwsza część trasy.');
  window.open(mapyRouteUrl(project.base, points.slice(0, 15)), '_blank', 'noopener');
}
function drawMarkers() {
  markers.forEach(m => m.remove()); markers = [];
  project.checkpoints.forEach(p => {
    const marker = L.marker([p.geo.lat, p.geo.lon], {
      icon: L.divIcon({ className: 'marker', html: `<b>${p.kind === 'base' ? 'B' : p.number.replace(/[&<>"']/g, '')}</b>`, iconSize: [34, 34] })
    }).addTo(map);
    markers.push(marker);
  });
  if (project.route?.geometry.length) {
    const line = L.polyline(project.route.geometry.map(p => [p.lat, p.lon]), { color: '#e85d04', weight: 5 }).addTo(map);
    markers.push(line);
  }
}
async function openProject() {
  const projects = await listProjects();
  if (!projects.length) { alert('Brak zapisanych projektów.'); return; }
  const names = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
  const choice = projects.length === 1 ? '1' : prompt(`Wybierz numer projektu:\n${names}`);
  const chosen = projects[Number(choice) - 1];
  if (!chosen) return;
  project = chosen; resetEditor();
  calibration = project.controlPoints.length >= 4 ? 'done' : 'idle';
  refresh();
}
function save() { project.updatedAt = Date.now(); void saveProject(project).catch(() => alert('Nie udało się zapisać projektu. Sprawdź wolne miejsce w telefonie.')); }

if ('serviceWorker' in navigator)
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
createApp();
