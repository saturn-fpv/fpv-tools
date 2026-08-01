/**
 * MapConfig module for initializing Leaflet basemaps in the F-Droid build flavor.
 * @module MapConfig
 */
window.MapConfig = {
    /**
     * Initializes and returns FOSS-only base layers (OSM & Offline Grid) for F-Droid compliance.
     * @param {L.Map} leafletMap - The target Leaflet map instance.
     * @returns {{defaultLayer: L.TileLayer, roadLayer: L.TileLayer, baseLayers: Object<string, L.Layer>}} Layer configuration object.
     */
    initLayers: function(leafletMap) {
        const osm = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        });

        osm.addTo(leafletMap);
        
        const offlineGrid = L.gridLayer.gridPattern();

        return {
            defaultLayer: osm,
            roadLayer: osm,
            baseLayers: {
                "OSM": osm,
                "Offline Grid": offlineGrid
            }
        };
    }
};
