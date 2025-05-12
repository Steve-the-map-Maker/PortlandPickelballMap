// map.test.js - Unit tests for applyFiltersAndRefresh in map.js

// --- Mocking Dependencies ---

// Mock DOM elements that applyFiltersAndRefresh reads from
document.body.innerHTML = `
    <input type="range" id="distance-slider" value="10">
    <select id="court-type-filter">
        <option value="any" selected>Any</option>
        <option value="indoor">Indoor</option>
        <option value="outdoor">Outdoor</option>
    </select>
    <select id="min-courts-filter">
        <option value="0" selected>Any</option>
        <option value="1">1+</option>
        <option value="2">2+</option> 
        <option value="3">3+</option>
        <option value="10">10+</option> 
    </select>
`;

// Mock global variables and functions map.js might interact with
let mockMapSourceData = null;
const mockMap = {
    getSource: (sourceId) => {
        if (sourceId === 'pickleball-courts') {
            return {
                setData: (data) => {
                    mockMapSourceData = data; // Capture data set to the map
                }
            };
        }
        return null;
    }
};

let mockUpdateCourtListData = null;
let mockUpdateCourtListUserLocation = null;
const mockUpdateCourtList = (features, userLoc) => {
    mockUpdateCourtListData = features;
    mockUpdateCourtListUserLocation = userLoc;
};

// Make functions from map.js available for testing.
// In a real test environment, you'd import them or structure your code for testability.
// For this example, we'll assume applyFiltersAndRefresh, calculateDistance, and parseCourtString 
// are accessible globally or we redefine them for the test context.

// --- Test Helper: Simplified versions of map.js functions for testing context ---
// (In a real scenario, you'd import these from map.js if possible)

function calculateDistance(lat1, lon1, lat2, lon2) { // Simplified for test, or use actual
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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


// --- Sample Data ---
const sampleAllCourtFeatures = [
    {
        geometry: { type: 'Point', coordinates: [-122.7, 45.5] }, // Approx 0km from sampleUserLocation
        properties: { name: 'Court A', 'number of courts': '3 Indoor courts', parsedNumCourts: 3, parsedCourtType: 'indoor' }
    },
    {
        geometry: { type: 'Point', coordinates: [-122.8, 45.6] }, // Approx 13km
        properties: { name: 'Court B', 'number of courts': '2 Outdoor courts', parsedNumCourts: 2, parsedCourtType: 'outdoor' }
    },
    {
        geometry: { type: 'Point', coordinates: [-122.9, 45.7] }, // Approx 27km
        properties: { name: 'Court C', 'number of courts': '4 Indoor/Outdoor courts', parsedNumCourts: 4, parsedCourtType: 'both' }
    },
    {
        geometry: { type: 'Point', coordinates: [-122.6, 45.4] }, // Approx 13km
        properties: { name: 'Court D', 'number of courts': '1 Outdoor court', parsedNumCourts: 1, parsedCourtType: 'outdoor' }
    },
    { // Feature with invalid coordinates for distance testing
        geometry: { type: 'Point', coordinates: [null, null] },
        properties: { name: 'Court E (Bad Coords)', 'number of courts': '1 Outdoor court', parsedNumCourts: 1, parsedCourtType: 'outdoor' }
    }
];

const sampleUserLocation = { lat: 45.5, lng: -122.7 };

// --- Test Suite ---
console.log("--- Running map.js applyFiltersAndRefresh Tests ---");

function runTest(testName, setupFn, assertionFn) {
    console.log(`\n[TEST] ${testName}`);
    // Reset mocks and global state for each test
    mockMapSourceData = null;
    mockUpdateCourtListData = null;
    mockUpdateCourtListUserLocation = null;
    
    // Reset DOM filter values to defaults
    document.getElementById('distance-slider').value = '100'; // Default to large distance
    document.getElementById('court-type-filter').value = 'any';
    document.getElementById('min-courts-filter').value = '0';

    // Global state for applyFiltersAndRefresh
    allCourtFeatures = JSON.parse(JSON.stringify(sampleAllCourtFeatures)); // Deep copy
    currentUserLocation = null; 
    map = mockMap; // Use the mock map
    updateCourtList = mockUpdateCourtList; // Use the mock updateCourtList

    if (setupFn) {
        setupFn();
    }

    // The function to test (assuming it's globally available for this test file)
    applyFiltersAndRefresh();

    if (assertionFn) {
        assertionFn();
    }
}

// --- Test Cases ---

runTest("No filters (user location null), all courts should show", 
    () => {
        // currentUserLocation is already null by default in runTest
    },
    () => {
        console.assert(mockMapSourceData.features.length === 5, "Map data should contain all 5 sample courts");
        console.assert(mockUpdateCourtListData.length === 5, "Court list should contain all 5 sample courts");
        console.assert(mockUpdateCourtListUserLocation === null, "User location for list update should be null");
    }
);

runTest("Distance filter: 15km around sampleUserLocation",
    () => {
        currentUserLocation = sampleUserLocation;
        document.getElementById('distance-slider').value = '15'; // Court A, B, D should be within 15km
    },
    () => {
        const expectedNames = ['Court A', 'Court B', 'Court D'];
        console.assert(mockMapSourceData.features.length === 3, `Map data: Expected 3 courts, got ${mockMapSourceData.features.length}`);
        console.assert(mockUpdateCourtListData.length === 3, `Court list: Expected 3 courts, got ${mockUpdateCourtListData.length}`);
        mockMapSourceData.features.forEach(f => {
            console.assert(expectedNames.includes(f.properties.name), `Unexpected court in map: ${f.properties.name}`);
        });
        console.assert(mockUpdateCourtListUserLocation === sampleUserLocation, "User location for list update should be set");
    }
);

runTest("Court Type filter: Indoor only",
    () => {
        document.getElementById('court-type-filter').value = 'indoor'; // Court A (indoor), Court C (both)
    },
    () => {
        const expectedNames = ['Court A', 'Court C'];
        console.assert(mockMapSourceData.features.length === 2, `Map data: Expected 2 courts, got ${mockMapSourceData.features.length}`);
        console.assert(mockUpdateCourtListData.length === 2, `Court list: Expected 2 courts, got ${mockUpdateCourtListData.length}`);
        mockMapSourceData.features.forEach(f => {
            console.assert(expectedNames.includes(f.properties.name), `Unexpected court in map: ${f.properties.name}`);
        });
    }
);

runTest("Court Type filter: Outdoor only",
    () => {
        document.getElementById('court-type-filter').value = 'outdoor'; // Court B (outdoor), Court C (both), Court D (outdoor), Court E (outdoor)
    },
    () => {
        const expectedNames = ['Court B', 'Court C', 'Court D', 'Court E (Bad Coords)'];
        console.assert(mockMapSourceData.features.length === 4, `Map data: Expected 4 courts, got ${mockMapSourceData.features.length}`);
        console.assert(mockUpdateCourtListData.length === 4, `Court list: Expected 4 courts, got ${mockUpdateCourtListData.length}`);
         mockMapSourceData.features.forEach(f => {
            console.assert(expectedNames.includes(f.properties.name), `Unexpected court in map: ${f.properties.name}`);
        });
    }
);

runTest("Min Courts filter: 3+ courts",
    () => {
        document.getElementById('min-courts-filter').value = '3'; // Court A (3), Court C (4)
    },
    () => {
        const expectedNames = ['Court A', 'Court C'];
        console.assert(mockMapSourceData.features.length === 2, `Map data: Expected 2 courts, got ${mockMapSourceData.features.length}`);
        console.assert(mockUpdateCourtListData.length === 2, `Court list: Expected 2 courts, got ${mockUpdateCourtListData.length}`);
        mockMapSourceData.features.forEach(f => {
            console.assert(expectedNames.includes(f.properties.name), `Unexpected court in map: ${f.properties.name}`);
        });
    }
);

runTest("Combined filter: 15km, Indoor, 3+ courts",
    () => {
        currentUserLocation = sampleUserLocation;
        document.getElementById('distance-slider').value = '15';
        document.getElementById('court-type-filter').value = 'indoor';
        document.getElementById('min-courts-filter').value = '3'; // Only Court A
    },
    () => {
        console.assert(mockMapSourceData.features.length === 1, `Map data: Expected 1 court, got ${mockMapSourceData.features.length}`);
        if (mockMapSourceData.features.length > 0) {
            console.assert(mockMapSourceData.features[0].properties.name === 'Court A', "Expected Court A");
        }
        console.assert(mockUpdateCourtListData.length === 1, `Court list: Expected 1 court, got ${mockUpdateCourtListData.length}`);
    }
);

runTest("Combined filter: Outdoor, 2+ courts, no location",
    () => {
        // currentUserLocation is null
        document.getElementById('court-type-filter').value = 'outdoor';
        document.getElementById('min-courts-filter').value = '2'; // Court B (2 outdoor), Court C (4 both)
    },
    () => {
        const expectedNames = ['Court B', 'Court C'];
        console.assert(mockMapSourceData.features.length === 2, `Map data: Expected 2 courts, got ${mockMapSourceData.features.length}`);
        console.assert(mockUpdateCourtListData.length === 2, `Court list: Expected 2 courts, got ${mockUpdateCourtListData.length}`);
         mockMapSourceData.features.forEach(f => {
            console.assert(expectedNames.includes(f.properties.name), `Unexpected court in map: ${f.properties.name}`);
        });
    }
);

runTest("No courts match filters",
    () => {
        document.getElementById('min-courts-filter').value = '10'; // No court has 10+
    },
    () => {
        console.assert(mockMapSourceData.features.length === 0, "Map data should be empty");
        console.assert(mockUpdateCourtListData.length === 0, "Court list should be empty");
    }
);

runTest("Feature with invalid coordinates is excluded by distance filter",
    () => {
        currentUserLocation = sampleUserLocation;
        document.getElementById('distance-slider').value = '100'; // Large distance, but Court E should be filtered out by its bad coords
    },
    () => {
        // Expect 4 courts (A, B, C, D), Court E should be filtered out due to invalid coords for distance calc
        console.assert(mockMapSourceData.features.length === 4, `Map data: Expected 4 courts (Court E excluded), got ${mockMapSourceData.features.length}`);
        console.assert(mockUpdateCourtListData.length === 4, `Court list: Expected 4 courts, got ${mockUpdateCourtListData.length}`);
        const featureNames = mockMapSourceData.features.map(f => f.properties.name);
        console.assert(!featureNames.includes('Court E (Bad Coords)'), "Court E with bad coordinates should not be in results when distance filter is active");
    }
);


console.log("\n--- Tests Finished ---");

// To make this testable in a browser console, you would need to:
// 1. Ensure map.js is loaded, making applyFiltersAndRefresh available.
// 2. Copy the content of this file (map.test.js) into the browser console.
// Note: This is a simplified test setup. Real-world testing uses frameworks like Jest, Mocha, QUnit, etc.
// for better structure, assertions, and test running.

// Definition of applyFiltersAndRefresh (copied from map.js for this standalone test context)
// In a real test setup, you would import this from map.js.
function applyFiltersAndRefresh() {
    if (!allCourtFeatures) return;

    const distanceSliderEl = document.getElementById('distance-slider');
    const courtTypeFilterEl = document.getElementById('court-type-filter');
    const minCourtsFilterEl = document.getElementById('min-courts-filter');

    const maxDistanceKm = currentUserLocation ? parseInt(distanceSliderEl.value, 10) : Infinity;
    const selectedCourtType = courtTypeFilterEl.value; 
    const selectedMinCourts = parseInt(minCourtsFilterEl.value, 10);

    let filteredFeatures = allCourtFeatures.filter(feature => {
        if (currentUserLocation) {
            if (feature.geometry && feature.geometry.type === 'Point' && feature.geometry.coordinates && feature.geometry.coordinates.length === 2) {
                const courtLng = feature.geometry.coordinates[0];
                const courtLat = feature.geometry.coordinates[1];
                if (typeof courtLat !== 'number' || typeof courtLng !== 'number' || isNaN(courtLat) || isNaN(courtLng)) {
                    return false; 
                }
                const distance = calculateDistance(currentUserLocation.lat, currentUserLocation.lng, courtLat, courtLng);
                if (distance > maxDistanceKm) {
                    return false;
                }
            } else {
                return false; 
            }
        }

        const parsedType = feature.properties.parsedCourtType;
        if (selectedCourtType !== 'any') {
            if (selectedCourtType === 'indoor' && !(parsedType === 'indoor' || parsedType === 'both')) {
                return false;
            }
            if (selectedCourtType === 'outdoor' && !(parsedType === 'outdoor' || parsedType === 'both')) {
                return false;
            }
        }

        const numCourts = feature.properties.parsedNumCourts;
        if (numCourts < selectedMinCourts) {
            return false;
        }
        
        return true;
    });

    if (map && map.getSource('pickleball-courts')) {
        map.getSource('pickleball-courts').setData({
            type: 'FeatureCollection',
            features: filteredFeatures
        });
    } else {
        // console.error("pickleball-courts source not found on map during test.");
    }

    if (typeof updateCourtList === 'function') {
        updateCourtList(filteredFeatures, currentUserLocation);
    }
}
