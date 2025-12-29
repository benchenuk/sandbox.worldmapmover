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
- **Initialization**: Leaflet map centered at (20, 0) with zoom level 2.
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
    - **Logic**: Leaflet does not natively support "dragging a polygon with projection distortion" out of the box (it usually drags pixels). We will implement a custom drag handler:
        - Listen for global `mousemove` when dragging.
        - Calculate `deltaPos` (pixel difference) from start drag point.
        - Convert `deltaPos` to `deltaLatLng`? No.
        - **Better Approach**: 
            - On `mousedown`, record `startLatLng`.
            - On `mousemove`, get `currentLatLng` of mouse.
            - `deltaLat = currentLatLng.lat - startLatLng.lat`
            - `deltaLng = currentLatLng.lng - startLatLng.lng`
            - **Constraint Check**: If `snapToLatitude` is true, set `deltaLat = 0`.
            - **Update Geometry**:
                - Iterate through all coordinates of the GeoJSON polygon.
                - New Coordinate = `(originalLat + deltaLat, originalLng + deltaLng)`.
            - Update `floatingLayer` with new GeoJSON.
    - **Distortion Handling**: By modifying the LatLng coordinates directly and letting Leaflet render them, the Web Mercator projection will automatically handle the size/shape distortion (e.g., countries will stretch vertically as they move North).

### 2.4 User Interface
- **Controls**:
    - **Top Right Panel**:
        - Toggle: "Snap Latitude" (Checkbox/Switch).
        - Button: "Reset" (Clears selection).
    - **Info Panel** (Bottom Left):
        - Shows "Moving: [Country Name]".
        - "Current Lat: [Value]".

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
