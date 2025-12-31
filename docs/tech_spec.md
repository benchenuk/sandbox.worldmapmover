# Technical Specification: World Map Country Mover

## 1. Architecture Overview
The application will be a client-side Single Page Application (SPA) with no backend dependencies other than serving static files.

### 1.1 Tech Stack
- **HTML5**: Semantic structure.
- **CSS3**: Styling for the UI overlay and map container.
- **JavaScript (ES6+)**: Application logic.
- **Mapping Library**: **Leaflet.js** (v1.9+).
    - *Reasoning*: Lightweight, open-source, excellent support for GeoJSON and custom interaction handlers, handles Mercator projection natively.
- **Data**: Natural Earth Admin 0 Countries (low resolution GeoJSON).

## 2. Component Design

### 2.1 Map Component
- **Initialization**: Leaflet map centered at (15, 0) with zoom level 3 to fill the viewport and reduce vertical white space.
- **Base Layer**: OpenStreetMap or CartoDB Positron (clean, minimal styling) tiles.
- **Projection**: Default `EPSG:3857` (Web Mercator).

### 2.2 Data Layer
- **GeoJSON Loading**: Load `countries.json` async.
- **Interactive Layer**:
    - Render all countries as `L.geoJSON`.
    - Style: Default fill color (e.g., `#dddddd`), stroke color (`#999999`).
    - Event Listeners: `click` on feature triggers "Pickup".

### 2.3 Logic & State Management
- **State**:
    - `selectedFeature`: The GeoJSON feature currently active.
    - `originalLayer`: Reference to the static layer on the map.
    - `floatingLayer`: The dynamic layer being dragged.
    - `isDragging`: Boolean flag.
    - `options.snapToLatitude`: Boolean toggle.

- **"Pickup" Mechanism**:
    1.  User clicks a country.
    2.  `floatingLayer` is created from `selectedFeature` geometry.
    3.  `floatingLayer` style: Semi-transparent (e.g., `opacity: 0.7`), accent color (e.g., `#3b82f6`).
    4.  `originalLayer` style: Dimmed/Outlined.

- **Dragging Mechanism**:
    - **Event Handling**: 
        - The `mousedown` event is attached to the `floatingLayer` (selected country) only, not the entire map.
        - This allows users to pan the map normally by clicking/dragging on empty areas.
        - Country dragging only initiates when clicking directly on the selected country.
        - Event propagation is stopped (`L.DomEvent.stopPropagation()`) to prevent interference with map panning.
    - **Logic**: Leaflet does not natively support "dragging a polygon with projection distortion" out of the box (it usually drags pixels). We implement a custom drag handler:
        - Listen for `mousedown` on the floating layer to start dragging.
        - Listen for global `mousemove` when dragging.
        - Listen for global `mouseup` to end dragging.
        - Calculate `deltaPos` (pixel difference) from start drag point.
        - Convert `deltaPos` to `deltaLatLng`? No.
        - **Better Approach**: 
            - On `mousedown` (on floating layer), record `startLatLng`.
            - On `mousemove`, get `currentLatLng` of mouse.
            - `deltaLat = currentLatLng.lat - startLatLng.lat`
            - `deltaLng = currentLatLng.lng - startLatLng.lng`
            - **Constraint Check**: If `snapToLatitude` is true, set `deltaLat = 0`.
            - **Update Geometry**:
                - Iterate through all coordinates of the GeoJSON polygon.
                - New Coordinate = `(originalLat + deltaLat, originalLng + deltaLng)`.
            - Update `floatingLayer` with new GeoJSON.
        - **Cleanup**: Remove event listeners when resetting or selecting a new country to prevent memory leaks.
    - **Distortion Handling**: 
        - **Vertical**: Web Mercator automatically stretches the vertical axis as the shape moves North/South (preserving the "height in degrees").
        - **Horizontal**: To maintain the correct aspect ratio (conformal shape), we must manually scale the longitude width of the shape.
        - **Algorithm**: `NewLng = AnchorLng + dLng + (OriginalLng - AnchorLng) * (cos(StartLat) / cos(NewLat))`. This expands/shrinks the width of the country inversely to the latitude cosine, matching the Mercator projection's scale factor.

### 2.4 User Interface
- **Controls**:
    - **Bottom Left Panel**:
        - Title: "Move Country"
        - Toggle: "Snap Latitude" (Checkbox/Switch).
        - Button: "Reset Map" (Clears selection).
    - **Bottom Right**:
        - Standard Leaflet zoom controls.

- **Country Labels**:
    - **Implementation**: Use Leaflet DivIcon markers positioned at country centroids.
    - **Centroid Calculation**: 
        - For Polygons: Use the outer ring coordinates.
        - For MultiPolygons: Use the largest polygon's coordinates.
        - Calculate average latitude/longitude from all coordinates.
    - **Styling**:
        - Font: 'Outfit', sans-serif
        - Default: 12px, opacity 0.5, font-weight 400
        - Hovered: opacity 0.9, font-weight 500
        - Selected: 14px, opacity 1.0, font-weight 600
        - Text shadow for readability against map background
    - **Interaction**:
        - Labels are non-interactive (pointer-events: none)
        - Opacity updates dynamically based on country interaction state
        - Smooth transitions (0.3s) between states

## 3. Data Structure
- `data/countries.json`: Standard GeoJSON FeatureCollection.

## 4. Implementation Steps
1.  **Setup**: HTML boilerplate, import Leaflet CSS/JS.
2.  **Basic Map**: Render map with tiles.
3.  **Data**: Fetch and display GeoJSON.
4.  **Interaction**: Implement Click -> Clone logic.
5.  **Dragging**: Implement the coordinate-shifting logic.
6.  **UI**: Add the control panel and wiring.
7.  **Refinement**: Smooth transitions, cursor updates, visual styling.

## 5. Security & Performance
- **XSS**: No user input stored/reflected properly (client-side only).
- **Performance**:
    - GeoJSON simplification might be needed for complex borders (e.g., Canada, Norway) to ensure 60fps dragging.
    - Use `canvas` renderer in Leaflet for better performance with large vector datasets if SVG effectively lags.
- **Interaction**:
    - Map panning remains fully responsive even when a country is selected.
    - Event listeners are properly cleaned up to prevent memory leaks when switching countries or resetting.
