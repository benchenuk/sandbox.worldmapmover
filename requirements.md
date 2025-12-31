# Requirements: World Map Country Mover

## 1. Project Overview
A web-based application that allows users to interactively select a country and virtually move it across a world map. The primary educational/visual goal is to demonstrate map projection distortions (specifically Mercator) by showing how a country's size and shape change relative to its latitude.

## 2. Functional Requirements

### 2.1 Country Selection
- Users must be able to select a country to "move".
- Selection is done by clicking on a country on the map.

### 2.2 Moving the Country
- Once selected, a "ghost" or "clone" of the country's shape is created.
- The user can drag this shape anywhere on the map by clicking and dragging **on the selected country itself**.
- **Map Panning**: Users can still pan the map freely by clicking and dragging on any empty area (ocean, other countries, etc.) even when a country is selected.
- **Real-time Distortion**: As the shape is dragged north or south, it must dynamically resize and reshape according to the Mercator projection rules (e.g., expanding significantly as it approaches the poles).

### 2.3 Constrained Movement (Snap to Latitude)
- An option/toggle must be available to "Lock Latitude" or "Snap to Latitude".
- When active, dragging is restricted to the horizontal axis (East-West) only.
- The country's latitude remains constant, meaning its size/shape distortion remains constant during the move.

### 2.4 Visual Feedback
- The original country location remains visible (dimmed) to allow comparison.
- The moving country is distinctively colored (blue).
- **Country Labels**: Display country names at their geographic centroids with dynamic opacity:
    - Selected country: Full opacity (100%) with bold text
    - Hovered country: High opacity (90%) with medium weight text
    - Other countries: Low opacity (30-50%) to reduce visual clutter

## 3. User Interface Requirements
- **Main Map Area**: A full-screen interactive world map, initialized at zoom level 3 to minimize white space.
- **Controls Overlay (Bottom Left)**:
    - Title: "Move Country"
    - Toggle Switch: "Lock Latitude" (On/Off).
    - Button: "Reset Map": Return country to original position.
- **Zoom Controls (Bottom Right)**: Standard Leaflet zoom buttons.
- **Visual Style**: Clean, modern, "glassmorphism" premium feel.

## 4. Non-Functional Requirements
- **Performance**: Dragging must be smooth (60fps) with immediate visual feedback on distortion.
- **Responsiveness**: Functional on desktop and tablet sizes.
- **Tech Stack**:
    - HTML5, CSS3, JavaScript.
    - Mapping Library: Leaflet (OpenSource, no API key required for basic tiles) or D3.js.
