const courtListContainer = document.getElementById('court-list-container');

function updateCourtList(features, userLocation) {
    if (!courtListContainer) {
        console.error('Court list container not found.');
        return;
    }
    courtListContainer.innerHTML = ''; // Clear existing list

    if (!features || features.length === 0) {
        courtListContainer.innerHTML = '<p>No courts found matching your criteria.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none'; // Remove bullet points
    ul.style.paddingLeft = '0'; // Remove default padding

    features.forEach(feature => {
        const li = document.createElement('li');
        li.className = 'court-list-item';
        li.setAttribute('data-lng', feature.geometry.coordinates[0]);
        li.setAttribute('data-lat', feature.geometry.coordinates[1]);

        let itemHTML = `<h4>${feature.properties.name}</h4>`;
        if (feature.properties.location) {
            itemHTML += `<p><small>${feature.properties.location}</small></p>`;
        }

        // Calculate and display distance if userLocation is provided
        // The distance is now pre-calculated and stored in feature.properties._calculatedDistance by map.js
        if (userLocation && feature.properties && feature.properties._calculatedDistance !== undefined && feature.properties._calculatedDistance !== Infinity) {
            itemHTML += `<p><strong>Distance:</strong> ${feature.properties._calculatedDistance.toFixed(2)} km</p>`;
        }

        li.innerHTML = itemHTML;

        li.addEventListener('click', () => {
            // Corrected to call panToFeatureAndShowDetail from map.js
            if (typeof panToFeatureAndShowDetail === 'function') { 
                panToFeatureAndShowDetail(feature);
            } else {
                console.warn('panToFeatureAndShowDetail function is not available in map.js.');
                // Fallback if the main function isn't found (e.g., fly to map)
                if(map && feature.geometry && feature.geometry.coordinates) { 
                    map.flyTo({
                        center: feature.geometry.coordinates,
                        zoom: Math.max(map.getZoom(), 14)
                    });
                }
            }
        });
        ul.appendChild(li);
    });
    courtListContainer.appendChild(ul);
}

// Function to display court details in the secondary panel
function displayCourtDetailsInPanel(properties, coordinates) {
    const detailPanel = document.getElementById('court-detail-panel');
    const detailContent = document.getElementById('court-detail-content');
    const closeButton = document.getElementById('close-detail-panel-btn');

    if (!detailPanel || !detailContent || !closeButton) {
        console.error('Court detail panel elements not found.');
        return;
    }

    // Populate content
    let contentHTML = `<p><strong>Name:</strong> ${properties.name || 'N/A'}</p>`;
    contentHTML += `<p><strong>Location:</strong> ${properties.location || 'N/A'}</p>`;
    contentHTML += `<p><strong>Number of Courts:</strong> ${properties['number of courts'] || 'N/A'}</p>`;

    // Add Get Directions link (opens in new tab)
    const courtLat = coordinates[1];
    const courtLng = coordinates[0];
    let directionsURL = `https://www.google.com/maps/search/?api=1&query=${courtLat},${courtLng}`;
    if (typeof currentUserLocation !== 'undefined' && currentUserLocation && currentUserLocation.lat && currentUserLocation.lng) {
        directionsURL = `https://www.google.com/maps/dir/?api=1&origin=${currentUserLocation.lat},${currentUserLocation.lng}&destination=${courtLat},${courtLng}`;
    }
    contentHTML += `<a href="${directionsURL}" target="_blank" class="get-directions-link">Get Directions</a>`;

    detailContent.innerHTML = contentHTML;

    // Show the panel
    detailPanel.classList.add('court-detail-panel-visible');

    // Ensure close button is wired up (if not already globally)
    // It's better to set this up once, e.g., in setupUIEventListeners
}

function closeCourtDetailPanel() {
    const detailPanel = document.getElementById('court-detail-panel');
    if (detailPanel) {
        detailPanel.classList.remove('court-detail-panel-visible');
    }
}

// This function initializes all UI event listeners, including the custom dropdown
function setupUIEventListeners() {
    const customSelectWrapper = document.querySelector('.custom-select-wrapper');
    const customSelectTrigger = document.querySelector('.custom-select-trigger');
    const customOptions = document.querySelector('.custom-options');
    const customOptionElements = document.querySelectorAll('.custom-option');
    const hiddenInput = document.getElementById('court-type-filter-value');
    
    // Ensure elements exist before adding listeners
    if (customSelectTrigger && customOptions && hiddenInput) {
        const triggerSpan = customSelectTrigger.querySelector('span');

        customSelectTrigger.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from immediately closing due to document listener
            const isOpen = customOptions.style.display === 'block';
            customOptions.style.display = isOpen ? 'none' : 'block';
            customSelectWrapper.classList.toggle('open', !isOpen);
        });

        if (customOptionElements) {
            customOptionElements.forEach(option => {
                option.addEventListener('click', () => {
                    const selectedValue = option.getAttribute('data-value');
                    const selectedText = option.querySelector('span:last-child').textContent;
                    
                    if (triggerSpan) {
                        triggerSpan.textContent = selectedText;
                    }
                    hiddenInput.value = selectedValue;
                    
                    customOptions.style.display = 'none';
                    customSelectWrapper.classList.remove('open');
                    
                    if (typeof applyFiltersAndRefresh === 'function') {
                        applyFiltersAndRefresh();
                    } else {
                        console.warn('applyFiltersAndRefresh function not found.');
                    }
                });
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (customSelectWrapper && !customSelectWrapper.contains(event.target)) {
                customOptions.style.display = 'none';
                customSelectWrapper.classList.remove('open');
            }
        });
    } else {
        console.warn('Custom select elements not found for event listener setup.');
    }

    // Initialize other filter event listeners
    const findNearbyBtn = document.getElementById('find-nearby-btn');
    if (findNearbyBtn) {
        findNearbyBtn.addEventListener('click', () => {
            if (typeof getUserLocationAndFilter === 'function') {
                getUserLocationAndFilter();
            } else {
                console.warn('getUserLocationAndFilter function not found.');
            }
        });
    }

    const distanceSlider = document.getElementById('distance-slider');
    const distanceValueDisplay = document.getElementById('distance-value');
    if (distanceSlider && distanceValueDisplay) {
        distanceSlider.addEventListener('input', (event) => {
            distanceValueDisplay.textContent = event.target.value;
            // It's common to trigger filter on 'change' or a dedicated button for sliders
            // but 'input' will make it very responsive.
            // Consider 'change' event if performance is an issue.
        });
        distanceSlider.addEventListener('change', () => { // Apply filter when user releases slider
            if (typeof applyFiltersAndRefresh === 'function') {
                applyFiltersAndRefresh();
            } else {
                console.warn('applyFiltersAndRefresh function not found.');
            }
        });
    }

    // New event listeners for the custom Min. Courts filter
    const minCourtsOptionsContainer = document.getElementById('min-courts-options-container');
    const minCourtsHiddenInput = document.getElementById('min-courts-filter-value');
    if (minCourtsOptionsContainer && minCourtsHiddenInput) {
        const options = minCourtsOptionsContainer.querySelectorAll('.min-court-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                options.forEach(opt => opt.classList.remove('active'));
                // Add active class to the clicked option
                option.classList.add('active');
                // Update the hidden input value
                minCourtsHiddenInput.value = option.getAttribute('data-value');
                // Apply filters
                if (typeof applyFiltersAndRefresh === 'function') {
                    applyFiltersAndRefresh();
                } else {
                    console.warn('applyFiltersAndRefresh function not found.');
                }
            });
        });
    }
    
    const closeDetailPanelBtn = document.getElementById('close-detail-panel-btn');
    if (closeDetailPanelBtn) {
        closeDetailPanelBtn.addEventListener('click', () => {
            if (typeof closeCourtDetailPanel === 'function') {
                closeCourtDetailPanel();
            } else {
                console.warn('closeCourtDetailPanel function not found.');
            }
        });
    }
}
