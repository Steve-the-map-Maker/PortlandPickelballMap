let map;
let currentUserLocation = null; // To store user's current location { lat, lng }
let allCourtFeatures = []; // To store all features from GeoJSON
let userLocationMarker = null; // To store the marker for user's location

function parseCourtString(courtString) {
    if (!courtString || typeof courtString !== 'string') {
        return { count: 0, type: 'unknown' };
    }
    const countMatch = courtString.match(/(\d+)/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 0;
    const lowerCaseString = courtString.toLowerCase();
    const isIndoor = lowerCaseString.includes('indoor');
    const isOutdoor = lowerCaseString.includes('outdoor');
    let type = 'unknown';
    if (isIndoor && isOutdoor) type = 'both';
    else if (isIndoor) type = 'indoor';
    else if (isOutdoor) type = 'outdoor';
    return { count, type };
}

function initializeMap() {
    map = new maplibregl.Map({
        container: 'map', // container id
        style: {
            'version': 8,
            'sources': {
                'osm': {
                    'type': 'raster',
                    'tiles': ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    'tileSize': 256,
                    'attribution': '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
            },
            'layers': [
                {
                    'id': 'osm',
                    'type': 'raster',
                    'source': 'osm'
                }
            ]
        },
        center: [-122.6784, 45.5152], // Initial center: Portland, OR
        zoom: 9 // Initial zoom level
    });

    map.on('load', async () => {
        const geojsonData = await loadGeoJSONData('data/PortlandPickelBallData.geojson'); // Corrected path
        if (geojsonData && geojsonData.features) {
            allCourtFeatures = geojsonData.features.map(feature => {
                const courtInfo = parseCourtString(feature.properties['number of courts']);
                feature.properties.parsedNumCourts = courtInfo.count;
                feature.properties.parsedCourtType = courtInfo.type;
                return feature;
            });

            map.addSource('pickleball-courts', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: allCourtFeatures
                }
            });

            map.addLayer({
                id: 'courts-points',
                type: 'circle',
                source: 'pickleball-courts',
                paint: {
                    // Dynamic radius based on the number of courts
                    'circle-radius': [
                        'step',
                        ['get', 'parsedNumCourts'], // Get the value of parsedNumCourts property
                        5, // Default radius for values less than the first stop
                        1, 6,  // If parsedNumCourts >= 1, radius is 6px
                        3, 8,  // If parsedNumCourts >= 3, radius is 8px
                        5, 10  // If parsedNumCourts >= 5, radius is 10px
                    ],
                    // Dynamic color based on court type
                    'circle-color': [
                        'match',
                        ['get', 'parsedCourtType'], // Get the value of parsedCourtType property
                        'indoor', '#3498db',  // If type is indoor, color is blue
                        'outdoor', '#2ecc71', // If type is outdoor, color is green
                        'both', '#9b59b6',    // If type is both, color is purple
                        '#95a5a6' // Default color for unknown or other types
                    ],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#000000', // Changed from #FFFFFF (white) to #000000 (black)
                    'circle-opacity': 0.85
                }
            });

            map.on('click', 'courts-points', (e) => {
                const feature = e.features[0];
                panToFeatureAndShowDetail(feature);
            });

            if (typeof setupUIEventListeners === 'function') {
                setupUIEventListeners();
            } else {
                console.error("setupUIEventListeners function not found.");
            }
            // Initially populate the list with all courts or a message
            if (typeof updateCourtList === 'function') {
                applyFiltersAndRefresh(); // Apply default filters and update list
            }

        } else {
            console.error('Failed to load pickleball court data for the map.');
            alert('Could not load court data.');
        }
    });
}

function panToFeatureAndShowDetail(feature) {
    console.log("panToFeatureAndShowDetail called with feature:", feature); // Log 1: Entry
    if (!feature || !feature.geometry || !feature.geometry.coordinates) {
        console.error("Invalid feature passed to panToFeatureAndShowDetail. Feature:", feature); // Log 2: Invalid feature
        return;
    }
    const coordinates = feature.geometry.coordinates.slice();
    map.flyTo({
        center: coordinates,
        zoom: Math.max(map.getZoom(), 14), // Zoom to 14 or current zoom if greater
        speed: 1.5
    });
    // Call UI function to display details in the sidebar panel
    if (typeof displayCourtDetailsInPanel === 'function') {
        console.log("Calling displayCourtDetailsInPanel from map.js"); // Log 3: Attempting to call ui.js function
        displayCourtDetailsInPanel(feature.properties, coordinates);
    } else {
        console.error("displayCourtDetailsInPanel function not found in ui.js"); // Log 4: ui.js function not found
    }
}

function getUserLocationAndFilter() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentUserLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                if (userLocationMarker) {
                    userLocationMarker.setLngLat([currentUserLocation.lng, currentUserLocation.lat]);
                } else {
                    userLocationMarker = new maplibregl.Marker({ color: '#007bff' })
                        .setLngLat([currentUserLocation.lng, currentUserLocation.lat])
                        .addTo(map);
                }

                map.flyTo({ center: [currentUserLocation.lng, currentUserLocation.lat], zoom: Math.max(map.getZoom(), 11) });

                applyFiltersAndRefresh(); 
            },
            (error) => {
                console.error("Error getting user location:", error);
                alert("Could not get your location. Please ensure location services are enabled.");
                // If location fails, perhaps show all courts in list
                if (typeof updateCourtList === 'function') {
                    updateCourtList(allCourtFeatures, null);
                }
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
        if (typeof updateCourtList === 'function') {
            updateCourtList(allCourtFeatures, null);
        }
    }
}

// Make calculateDistance globally accessible for ui.js or ensure ui.js has its own
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function applyFiltersAndRefresh() {
    if (!allCourtFeatures || !map) return;

    const distanceSliderEl = document.getElementById('distance-slider');
    const courtTypeFilterHiddenInputEl = document.getElementById('court-type-filter-value');
    // Corrected to get the hidden input for the Min. Courts filter
    const minCourtsFilterEl = document.getElementById('min-courts-filter-value');

    const maxDistanceKm = currentUserLocation && distanceSliderEl ? parseInt(distanceSliderEl.value, 10) : Infinity;
    const selectedCourtType = courtTypeFilterHiddenInputEl ? courtTypeFilterHiddenInputEl.value : 'any'; 
    // Ensure minCourtsFilterEl exists before trying to read its value
    const selectedMinCourts = minCourtsFilterEl ? parseInt(minCourtsFilterEl.value, 10) : 0;

    let filteredFeatures = allCourtFeatures.filter(feature => {
        // Distance Filter
        if (currentUserLocation) {
            if (feature.geometry && feature.geometry.type === 'Point' && feature.geometry.coordinates && feature.geometry.coordinates.length === 2) {
                const courtLng = feature.geometry.coordinates[0];
                const courtLat = feature.geometry.coordinates[1];
                if (typeof courtLat !== 'number' || typeof courtLng !== 'number' || isNaN(courtLat) || isNaN(courtLng)) {
                    feature.properties._calculatedDistance = Infinity; // Store for sorting if needed
                    return false; // Skip features with invalid coordinates
                }
                const distance = calculateDistance(currentUserLocation.lat, currentUserLocation.lng, courtLat, courtLng);
                feature.properties._calculatedDistance = distance; // Store for sorting and UI display
                if (distance > maxDistanceKm) {
                    return false;
                }
            } else {
                feature.properties._calculatedDistance = Infinity; // Store for sorting if needed
                return false; // Skip features without valid point geometry if location filter is active
            }
        }

        // Court Type Filter
        const parsedType = feature.properties.parsedCourtType; 
        if (selectedCourtType !== 'any') {
            // If the filter is 'indoor', we accept 'indoor' or 'both'.
            // If the filter is 'outdoor', we accept 'outdoor' or 'both'.
            // If the filter is 'both', we only accept 'both'. 
            // (The custom dropdown currently doesn't have a 'both' option for filtering, 
            // but if it did, or if 'any' is not selected, this logic handles it)
            if (selectedCourtType === 'indoor' && !(parsedType === 'indoor' || parsedType === 'both')) {
                return false;
            }
            if (selectedCourtType === 'outdoor' && !(parsedType === 'outdoor' || parsedType === 'both')) {
                return false;
            }
            // If a future 'both' filter option is added:
            // if (selectedCourtType === 'both' && parsedType !== 'both') {
            //     return false;
            // }
        }

        // Min Courts Filter
        const numCourts = feature.properties.parsedNumCourts; // Now populated during data load
        if (numCourts < selectedMinCourts) {
            return false;
        }
        
        return true;
    });

    // Create a mutable copy for sorting if needed, or for passing to updateCourtList
    let featuresForList = [...filteredFeatures];

    if (currentUserLocation) {
        // Sort the featuresForList by the calculated distance
        featuresForList.sort((a, b) => {
            // Ensure _calculatedDistance exists, default to Infinity if not
            const distA = (a.properties && a.properties._calculatedDistance !== undefined) ? a.properties._calculatedDistance : Infinity;
            const distB = (b.properties && b.properties._calculatedDistance !== undefined) ? b.properties._calculatedDistance : Infinity;
            return distA - distB;
        });
    }
    // Optional: Add an else block here to sort by another criteria (e.g., name) if currentUserLocation is null

    if (map.getSource('pickleball-courts')) {
        map.getSource('pickleball-courts').setData({
            type: 'FeatureCollection',
            features: filteredFeatures // Map markers are based on the original filtered set
        });
    } else {
        console.error("pickleball-courts source not found on map.");
    }

    if (typeof updateCourtList === 'function') {
        updateCourtList(featuresForList, currentUserLocation); // Pass the (potentially sorted) list to the UI
    }
}

function filterCourtsByDistance(userLoc, maxDistanceKm) {
    // This function might become redundant or be merged into applyFiltersAndRefresh
    // For now, let's have applyFiltersAndRefresh be the main entry point
    if (userLoc) {
        currentUserLocation = userLoc;
    }
    applyFiltersAndRefresh(); 
}
