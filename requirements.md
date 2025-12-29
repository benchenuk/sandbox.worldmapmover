# Requirements: World Map Country Mover

## 1. Project Overview
A web-based application that allows users to interactively select a country and virtually move it across a world map. The primary educational/visual goal is to demonstrate map projection distortions (specifically Mercator) by showing how a country's size and shape change relative to its latitude.

## 2. Functional Requirements

### 2.1 Country Selection
- Users must be able to select a country to "move".
- Selection can be done via:
    - Clicking on a country on the map.
    - Searching/Selecting from a dropdown list.

### 2.2 Moving the Country
- Once selected, a "ghost" or "clone" of the country's shape is created.
- The user can drag this shape anywhere on the map using the mouse or touch interface.
- **Real-time Distortion**: As the shape is dragged north or south, it must dynamically resize and reshape according to the Mercator projection rules (e.g., expanding significantly as it approaches the poles).

### 2.3 Constrained Movement (Snap to Latitude)
- An option/toggle must be available to "Lock Latitude" or "Snap to Latitude".
- When active, dragging is restricted to the horizontal axis (East-West) only.
- The country's latitude remains constant, meaning its size/shape distortion remains constant during the move.

### 2.4 Visual Feedback
- The original country location remains visible (potentially dimmed or outlined) to allow comparison.
- The moving country should be semi-transparent or distinctively colored.
- Display current coordinates (Latitude/Longitude) of the center of the moving country.

## 3. User Interface Requirements
- **Main Map Area**: A full-screen or large interactive world map.
- **Controls Overlay**:
    - Country Selector (Dropdown/Input).
    - Toggle Switch: "Lock Latitude" (On/Off).
    - Reset Button: Return country to original position.
- **Visual Style**: Clean, modern, "premium" feel as per general guidelines.

## 4. Non-Functional Requirements
- **Performance**: Dragging must be smooth (60fps) with immediate visual feedback on distortion.
- **Responsiveness**: Functional on desktop and tablet sizes.
- **Tech Stack**:
    - HTML5, CSS3, JavaScript.
    - Mapping Library: Leaflet (OpenSource, no API key required for basic tiles) or D3.js.
