// Initialize map
const map = L.map('map', {
    zoomControl: false,
    minZoom: 2,
    worldCopyJump: true,
    maxBounds: [[-90, -180], [90, 180]]
}).setView([15, 0], 3);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// Add Base Layer (CartoDB Positron for clean look)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// State
let countriesLayer;
let countryLabels; // Layer group for country labels
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

        // Create country labels
        createCountryLabels(data);
    })
    .catch(err => console.error('Error loading GeoJSON:', err));

// Create Country Labels
function createCountryLabels(geojson) {
    countryLabels = L.layerGroup().addTo(map);

    geojson.features.forEach(feature => {
        const name = feature.properties.name || feature.properties.admin || '';
        if (!name) return;

        // Calculate centroid
        const centroid = getCentroid(feature.geometry);
        if (!centroid) return;

        // Create label marker
        const label = L.marker([centroid.lat, centroid.lng], {
            icon: L.divIcon({
                className: 'country-label',
                html: `<span class="country-label-text" data-country-id="${feature.id}">${name}</span>`,
                iconSize: null
            }),
            interactive: false,
            pane: 'markerPane'
        });

        label.featureId = feature.id;
        label.addTo(countryLabels);
    });
}

// Calculate centroid of a geometry
function getCentroid(geometry) {
    let coords = [];

    if (geometry.type === 'Polygon') {
        coords = geometry.coordinates[0]; // Outer ring
    } else if (geometry.type === 'MultiPolygon') {
        // Use the largest polygon
        let largest = geometry.coordinates[0][0];
        geometry.coordinates.forEach(poly => {
            if (poly[0].length > largest.length) {
                largest = poly[0];
            }
        });
        coords = largest;
    } else {
        return null;
    }

    // Calculate average lat/lng
    let sumLat = 0, sumLng = 0;
    coords.forEach(coord => {
        sumLng += coord[0];
        sumLat += coord[1];
    });

    return {
        lat: sumLat / coords.length,
        lng: sumLng / coords.length
    };
}

// Update label opacity based on interaction state
function updateLabelOpacity(featureId = null, state = 'default') {
    if (!countryLabels) return;

    countryLabels.eachLayer(layer => {
        const labelElement = layer.getElement();
        if (!labelElement) return;

        const textElement = labelElement.querySelector('.country-label-text');
        if (!textElement) return;

        if (featureId && layer.featureId === featureId) {
            // Highlighted/Selected country
            if (state === 'selected') {
                textElement.style.opacity = '1';
                textElement.style.fontWeight = '600';
                textElement.style.fontSize = '14px';
            } else if (state === 'hover') {
                textElement.style.opacity = '0.9';
                textElement.style.fontWeight = '500';
            }
        } else {
            // Other countries - less visible
            textElement.style.opacity = '0.3';
            textElement.style.fontWeight = '400';
            textElement.style.fontSize = '12px';
        }
    });
}

// Reset all labels to default state
function resetAllLabels() {
    if (!countryLabels) return;

    countryLabels.eachLayer(layer => {
        const labelElement = layer.getElement();
        if (!labelElement) return;

        const textElement = labelElement.querySelector('.country-label-text');
        if (!textElement) return;

        textElement.style.opacity = '0.5';
        textElement.style.fontWeight = '400';
        textElement.style.fontSize = '12px';
    });
}

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

    // Highlight label on hover
    updateLabelOpacity(e.target.feature.id, 'hover');
}

function resetHighlight(e) {
    if (selectedFeature && e.target.feature.id === selectedFeature.id) return;
    countriesLayer.resetStyle(e.target);

    // Reset labels when not hovering
    if (!selectedFeature) {
        resetAllLabels();
    } else {
        updateLabelOpacity(selectedFeature.id, 'selected');
    }
}

function selectCountry(e) {
    if (isDragging) return;

    // Reset previous selection
    if (floatingLayer) {
        // Clean up event listeners
        floatingLayer.off('mousedown', onCountryDragStart);
        map.off('mousemove', onDragMove);
        map.off('mouseup', onDragEnd);
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



    // Highlight selected country label
    updateLabelOpacity(selectedFeature.id, 'selected');

    // Add drag handlers to the floating layer itself
    floatingLayer.on('mousedown', onCountryDragStart);
    map.on('mousemove', onDragMove);
    map.on('mouseup', onDragEnd);
}

// Drag Logic with Coordinate Math
function onCountryDragStart(e) {
    // Only start dragging if we click on the floating layer
    if (!floatingLayer) return;

    // Prevent the event from propagating to the map (which would start map panning)
    L.DomEvent.stopPropagation(e.originalEvent);
    L.DomEvent.preventDefault(e.originalEvent);

    isDragging = true;
    map.dragging.disable(); // Disable map panning while dragging country
    dragStartLatLng = e.latlng;

    // Capture deep copy of coordinates at drag start
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

    // Calculate scaling factor based on latitude change (Mercator projection)
    // Scale factor k = cos(startLat) / cos(newLat)
    // We clamp latitude to +/- 85 degrees to avoid extreme scaling or division by zero
    const CLAMP_LIMIT = 85;
    const startLatClamped = Math.max(-CLAMP_LIMIT, Math.min(CLAMP_LIMIT, dragStartLatLng.lat));
    // If snapToLat is on, effective new lat is same as start lat
    const currentLatEffective = snapToLat ? dragStartLatLng.lat : currentLatLng.lat;
    const endLatClamped = Math.max(-CLAMP_LIMIT, Math.min(CLAMP_LIMIT, currentLatEffective));

    const rad = Math.PI / 180;
    const startScale = Math.cos(startLatClamped * rad);
    const endScale = Math.cos(endLatClamped * rad);

    // Maintain minimum scale to prevent division by zero or negative
    const k = (endScale > 0.001) ? (startScale / endScale) : 1;

    // Apply diff to all coordinates
    const newGeoJSON = JSON.parse(JSON.stringify(floatingLayer.toGeoJSON().features[0]));
    newGeoJSON.geometry.coordinates = shiftCoordinates(
        dragStartCoordinates,
        latDiff,
        lngDiff,
        dragStartLatLng.lng, // Anchor Longitude
        k,                   // Scale Factor
        newGeoJSON.geometry.type
    );

    // Update Layer
    floatingLayer.clearLayers();
    floatingLayer.addData(newGeoJSON);


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
function shiftCoordinates(coords, dLat, dLng, anchorLng, scale, type) {
    if (typeof coords[0] === 'number') {
        // [lng, lat]
        const originalLng = coords[0];
        const originalLat = coords[1];

        // Scale longitude relative to the anchor, then translate
        // Formula: NewLng = AnchorLng + dLng + (OriginalLng - AnchorLng) * scale
        const newLng = anchorLng + dLng + (originalLng - anchorLng) * scale;
        const newLat = originalLat + dLat;

        return [newLng, newLat];
    }

    return coords.map(sub => shiftCoordinates(sub, dLat, dLng, anchorLng, scale, type));
}



// Controls
snapToggle.addEventListener('change', (e) => {
    snapToLat = e.target.checked;
});

resetBtn.addEventListener('click', () => {
    if (floatingLayer) {
        // Clean up event listeners
        floatingLayer.off('mousedown', onCountryDragStart);
        map.off('mousemove', onDragMove);
        map.off('mouseup', onDragEnd);
        map.removeLayer(floatingLayer);
        floatingLayer = null;
    }
    if (selectedFeature && countriesLayer) {
        // Reset style of original
        countriesLayer.resetStyle(countriesLayer.getLayer(countriesLayer.getLayerId(selectedFeature)));
        selectedFeature = null;
    }

    isDragging = false;
    map.dragging.enable();

    // Reset all labels to default
    resetAllLabels();
});
