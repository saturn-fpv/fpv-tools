/**
 * MapConfig module for initializing Leaflet basemaps across environments.
 * @module MapConfig
 */
window.MapConfig = {
    /**
     * Initializes and returns default base layers for the Leaflet map instance.
     * @param {L.Map} leafletMap - The target Leaflet map instance.
     * @returns {{defaultLayer: L.TileLayer, roadLayer: L.TileLayer, baseLayers: Object<string, L.Layer>}} Layer configuration object.
     */
    initLayers: function(leafletMap) {
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Esri Satellite'
        });
        
        const osm = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        });

        satellite.addTo(leafletMap);
        
        const offlineGrid = L.gridLayer.gridPattern();

        return {
            defaultLayer: satellite,
            roadLayer: osm,
            baseLayers: {
                "Satellite": satellite,
                "OSM": osm,
                "Offline Grid": offlineGrid
            }
        };
    }
};
