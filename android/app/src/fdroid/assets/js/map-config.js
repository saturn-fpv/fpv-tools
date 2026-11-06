/**
 * MapConfig module for initializing Leaflet basemaps in the F-Droid build flavor.
 *
 * Gradle substitutes this file for the root js/map-config.js when assembling
 * the fdroid flavour. It must expose the same public API as that file
 * (initLayers + setRoadTheme) so the tool pages work unchanged.
 *
 * Only OpenStreetMap tiles are used here. Esri satellite and street layers
 * would trigger F-Droid's NonFreeNet anti-feature.
 *
 * KNOWN LIMITATION: tile.openstreetmap.org returns a 403 "Access blocked"
 * tile when a request carries no Referer header, and browsers send none from
 * a file:// origin - which is how the WebView loads these assets
 * (file:///android_asset/...). The street layer therefore cannot render in
 * this flavour until the WebView serves its assets from an https origin
 * (androidx.webkit WebViewAssetLoader, i.e. https://appassets.androidplatform.net/).
 * Until then the Offline Grid is the dependable layer here, and it is the
 * default for that reason.
 *
 * @module MapConfig
 */
window.MapConfig = {
    /**
     * Street basemap definition. F-Droid uses the same FOSS OpenStreetMap
     * tiles for both themes, so there is no per-theme variant.
     * @type {{url: string, attribution: string}}
     */
    roadTiles: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },

    /**
     * Initializes and returns FOSS-only base layers (OSM & Offline Grid) for F-Droid compliance.
     * @param {L.Map} leafletMap - The target Leaflet map instance.
     * @returns {{defaultLayer: L.TileLayer, roadLayer: L.TileLayer, baseLayers: Object<string, L.Layer>}} Layer configuration object.
     */
    initLayers: function (leafletMap) {
        const osm = L.tileLayer(this.roadTiles.url, {
            maxZoom: 19,
            attribution: this.roadTiles.attribution
        });

        const offlineGrid = L.gridLayer.gridPattern();

        // The offline grid is the default here: OSM tiles are blocked from the
        // WebView's file:// origin (see the module comment above).
        offlineGrid.addTo(leafletMap);

        return {
            defaultLayer: offlineGrid,
            roadLayer: osm,
            baseLayers: {
                "Offline Grid": offlineGrid,
                "Street": osm
            }
        };
    },

    /**
     * No-op theme hook. The F-Droid flavour serves one FOSS tile set for both
     * themes; this exists so tool pages can call it unconditionally.
     * @param {L.TileLayer} roadLayer - The street layer returned by initLayers.
     * @param {string} theme - Either 'light' or 'dark'. Ignored.
     * @returns {void}
     */
    setRoadTheme: function (roadLayer, theme) {
        /* Intentionally empty - see doc comment. */
    }
};
