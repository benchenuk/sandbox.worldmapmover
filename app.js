// Initialize map
const map = L.map('map', {
    zoomControl: false,
    minZoom: 2,
    maxBounds: [[-90, -180], [90, 180]]
}).setView([20, 0], 2);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// Add Base Layer (CartoDB Positron for clean look)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// State
let countriesLayer;
let floatingLayer = null;
let originalFeature = null;
let selectedFeature = null;

let isDragging = false;
let dragStartLatLng = null;
let dragStartCoordinates = null; // Original coordinates of the floating feature
let snapToLat = false;

// DOM Elements
const snapToggle = document.getElementById('snap-lat-toggle');
const resetBtn = document.getElementById('reset-btn');
const infoPanel = document.getElementById('info-panel');
const countryNameEl = document.getElementById('country-name');
const currentLatEl = document.getElementById('current-lat');
const currentLngEl = document.getElementById('current-lng');

// Load Data
fetch('countries.json')
    .then(res => res.json())
    .then(data => {
        countriesLayer = L.geoJSON(data, {
            style: {
                fillColor: '#cbd5e1',
                weight: 1,
                opacity: 1,
                color: '#94a3b8',
                fillOpacity: 0.6
            },
            onEachFeature: onEachFeature
        }).addTo(map);
    })
    .catch(err => console.error('Error loading GeoJSON:', err));

// Interaction Handlers
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: selectCountry
    });
}

function highlightFeature(e) {
    if (selectedFeature && e.target.feature.id === selectedFeature.id) return;
    
    const layer = e.target;
    layer.setStyle({
        weight: 2,
        color: '#64748b',
        fillOpacity: 0.8
    });
    layer.bringToFront();
}

function resetHighlight(e) {
    if (selectedFeature && e.target.feature.id === selectedFeature.id) return;
    countriesLayer.resetStyle(e.target);
}

function selectCountry(e) {
    if (isDragging) return;

    // Reset previous selection
    if (floatingLayer) {
        map.removeLayer(floatingLayer);
        floatingLayer = null;
    }
    if (selectedFeature && countriesLayer) {
        countriesLayer.resetStyle(countriesLayer.getLayer(countriesLayer.getLayerId(selectedFeature)));
    }

    const layer = e.target;
    selectedFeature = feature = layer.feature;
    originalFeature = JSON.parse(JSON.stringify(feature)); // Deep copy

    // Dim the original
    layer.setStyle({
        fillOpacity: 0.2,
        weight: 1,
        color: '#e2e8f0'
    });

    // Create Floating Layer
    floatingLayer = L.geoJSON(feature, {
        style: {
            fillColor: '#3b82f6',
            weight: 2,
            opacity: 1,
            color: '#2563eb',
            fillOpacity: 0.7,
            className: 'floating-country'
        }
    }).addTo(map);

    // Update Info Panel
    countryNameEl.textContent = feature.properties.name || feature.properties.admin || "Selected Country";
    updateInfoCoords(e.latlng);
    infoPanel.classList.remove('hidden');

    // Init Drag Logic immediately on click? 
    // Usually user clicks to select, then drags. 
    // Let's make the floating layer draggable.
    
    // Add custom drag handlers to map for the floating layer
    map.on('mousedown', onDragStart);
    map.on('mousemove', onDragMove);
    map.on('mouseup', onDragEnd);
}

// Drag Logic with Coordinate Math
function onDragStart(e) {
    // Check if we are clicking ON the floating layer or near it? 
    // For better UX, let's treat any click after selection as a drag start if we have a selection?
    // Or strictly click on the polygon.
    // Simplifying: If we have a floating layer, hitting mousedown on map starts drag.
    if (!floatingLayer) return;
    
    isDragging = true;
    map.dragging.disable(); // Disable map panning
    dragStartLatLng = e.latlng;
    
    // Capture deep copy of coordinates at text start
    // GeoJSON coordinates can be MultiPolygon (nested arrays)
    // We need a reliable way to transform them.
    dragStartCoordinates = JSON.parse(JSON.stringify(floatingLayer.toGeoJSON().features[0].geometry.coordinates));
}

function onDragMove(e) {
    if (!isDragging || !floatingLayer) return;

    const currentLatLng = e.latlng;
    let latDiff = currentLatLng.lat - dragStartLatLng.lat;
    const lngDiff = currentLatLng.lng - dragStartLatLng.lng;

    if (snapToLat) {
        latDiff = 0;
    }

    // Apply diff to all coordinates
    const newGeoJSON = JSON.parse(JSON.stringify(floatingLayer.toGeoJSON().features[0]));
    newGeoJSON.geometry.coordinates = shiftCoordinates(dragStartCoordinates, latDiff, lngDiff, newGeoJSON.geometry.type);

    // Update Layer
    floatingLayer.clearLayers();
    floatingLayer.addData(newGeoJSON);

    // Update Info
    updateInfoCoords(currentLatLng);
}

function onDragEnd() {
    isDragging = false;
    map.dragging.enable();
    // Update dragStartCoordinates to current state in case we continue dragging?
    // Actually our logic relies on dragStartLatLng which resets on every drag start.
    // But if we drag, stop, drag again -> we need the simplified logic to hold.
    // The `selectCountry` sets `floatingLayer`. 
    // But `dragStartCoordinates` must be updated if we drag again.
    // Simpler: On MouseDown we re-capture the CURRENT state of floatingLayer as the baseline.
}

// Recursively shift coordinates
function shiftCoordinates(coords, dLat, dLng, type) {
    if (typeof coords[0] === 'number') {
        // [lng, lat]
        return [coords[0] + dLng, coords[1] + dLat];
    }
    
    return coords.map(sub => shiftCoordinates(sub, dLat, dLng, type));
}

function updateInfoCoords(latlng) {
    currentLatEl.textContent = latlng.lat.toFixed(2);
    currentLngEl.textContent = latlng.lng.toFixed(2);
}

// Controls
snapToggle.addEventListener('change', (e) => {
    snapToLat = e.target.checked;
});

resetBtn.addEventListener('click', () => {
    if (floatingLayer) {
        map.removeLayer(floatingLayer);
        floatingLayer = null;
    }
    if (selectedFeature && countriesLayer) {
        // Reset style of original
        countriesLayer.resetStyle(countriesLayer.getLayer(countriesLayer.getLayerId(selectedFeature)));
        selectedFeature = null;
    }
    infoPanel.classList.add('hidden');
    isDragging = false;
    map.dragging.enable();
});
