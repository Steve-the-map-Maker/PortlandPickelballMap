# Pickleball Court Finder Map

This web application helps users discover pickleball court locations in the Portland area. It's built with HTML, CSS, and vanilla JavaScript, utilizing the MapLibre GL JS library for interactive mapping.

## Key Features:

*   **Interactive Map Display:** Visualizes pickleball courts from a GeoJSON data source on a dynamic MapLibre map.
*   **Geolocation:** Allows users to find courts near their current location.
*   **Advanced Filtering:**
    *   Filter courts by distance from the user (1km to 100km).
    *   Filter by court type (Indoor, Outdoor, or Any).
    *   Filter by the minimum number of courts available at a location (1 to 8+).
*   **Dynamic Sidebar:**
    *   Lists courts based on the current map view and active filters.
    *   Displays detailed information for a selected court in a slide-in panel, including name, location, and number of courts.
*   **"Get Directions":** Provides a link to Google Maps for directions to the selected court, pre-filling the user's current location if available.
*   **Dynamic Map Marker Styling:** Map markers are styled based on:
    *   **Size:** Reflects the number of courts at the location (larger circles for more courts).
    *   **Color:** Indicates court type (Blue for Indoor, Green for Outdoor, Purple for Both).
*   **Custom UI Controls:**
    *   A custom-styled dropdown for selecting court type, featuring color swatches.
    *   A visual filter for minimum courts, using clickable circles of varying sizes with numerical labels.
*   **Responsive Design:** Adapts to different screen sizes, including mobile devices.

## Technology Stack:

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Mapping Library:** MapLibre GL JS
*   **Data Format:** GeoJSON (`../data/PortlandPickelBallData.geojson`)

## How to Run:

1.  Clone this repository (or ensure all project files are in the correct structure).
2.  Open the `pickleball-map/index.html` file in your web browser.
    *   For the "Find Courts Near Me" feature to work, you may need to serve the files from a local web server (e.g., using Python's `http.server` or a VS Code Live Server extension) due to browser security restrictions on geolocation for `file:///` URLs.

## Data Source:

The court location data is sourced from `../data/PortlandPickelBallData.geojson`. This file is loaded dynamically by the application.

---
*Project developed as of May 2025.*
