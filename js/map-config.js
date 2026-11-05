/**
 * MapConfig module for initializing Leaflet basemaps across environments.
 *
 * This is the Google Play / Saturn FPV Website configuration. The F-Droid
 * flavour ships its own copy at android/app/src/fdroid/assets/js/map-config.js
 * which Gradle substitutes at build time; both files must expose the same
 * public API (initLayers + setRoadTheme).
 *
 * Tile sources are deliberately limited to providers that serve raster tiles
 * without an API key. CARTO basemaps (basemaps.cartocdn.com) were used here
 * previously and now return an "API KEY REQUIRED" watermark tile instead of
 * map data, so they must not be reintroduced.
 *
 * @module MapConfig
 */
window.MapConfig = {
    /**
     * Street basemap definitions keyed by UI theme.
     * Light: standard OpenStreetMap raster tiles.
     * Dark:  Esri Dark Gray Canvas - same provider as the satellite layer,
     *        free and key-less. Esri publishes this basemap to zoom 16
     *        worldwide, so maxNativeZoom caps tile requests there and lets
     *        Leaflet upscale beyond it rather than show blank tiles.
     * @type {Object<string, {url: string, maxNativeZoom: (number|undefined), attribution: string}>}
     */
    roadTiles: {
        light: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxNativeZoom: undefined,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        dark: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            maxNativeZoom: 16,
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        }
    },

    /**
     * Resolves the active UI theme without depending on the caller.
     * @returns {string} Either 'light' or 'dark'.
     */
    resolveTheme: function () {
        try {
            if (document.body && document.body.classList.contains('light-theme')) return 'light';
            if (localStorage.getItem('fpv-tools-theme') === 'light') return 'light';
        } catch (e) { /* localStorage may be blocked under file:// */ }
        return 'dark';
    },

    /**
     * Initializes and returns default base layers for the Leaflet map instance.
     * @param {L.Map} leafletMap - The target Leaflet map instance.
     * @returns {{defaultLayer: L.TileLayer, roadLayer: L.TileLayer, baseLayers: Object<string, L.Layer>}} Layer configuration object.
     */
    initLayers: function (leafletMap) {
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Esri Satellite'
        });

        const theme = this.resolveTheme();
        const tiles = this.roadTiles[theme];

        const road = L.tileLayer(tiles.url, {
            maxZoom: 19,
            maxNativeZoom: tiles.maxNativeZoom,
            attribution: tiles.attribution
        });

        satellite.addTo(leafletMap);

        const offlineGrid = L.gridLayer.gridPattern();

        return {
            defaultLayer: satellite,
            roadLayer: road,
            baseLayers: {
                "Satellite": satellite,
                "OSM": road,
                "Offline Grid": offlineGrid
            }
        };
    },

    /**
     * Repoints the street basemap at the tile set matching the active theme.
     * Safe to call when the layer is not currently on the map.
     * @param {L.TileLayer} roadLayer - The street layer returned by initLayers.
     * @param {string} theme - Either 'light' or 'dark'.
     * @returns {void}
     */
    setRoadTheme: function (roadLayer, theme) {
        if (!roadLayer || typeof roadLayer.setUrl !== 'function') return;
        const tiles = this.roadTiles[theme === 'light' ? 'light' : 'dark'];
        if (!tiles) return;
        // maxNativeZoom differs per provider, so update it before the refetch.
        roadLayer.options.maxNativeZoom = tiles.maxNativeZoom;
        roadLayer.options.attribution = tiles.attribution;
        roadLayer.setUrl(tiles.url);
    }
};
