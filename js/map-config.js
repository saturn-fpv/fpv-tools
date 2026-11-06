/**
 * MapConfig module for initializing Leaflet basemaps across environments.
 *
 * Shared by the Android app and the Saturn FPV Website.
 *
 * Tile provider constraints that drove these choices:
 *
 *  - CARTO (basemaps.cartocdn.com) now requires an API key on every basemap.
 *    It answers HTTP 200 with a ~2 KB "API KEY REQUIRED" watermark, so Leaflet
 *    sees no tile error and silently renders the watermark. Do not reintroduce.
 *
 *  - tile.openstreetmap.org rejects requests that carry no Referer header,
 *    answering with a 403 "Access blocked" tile. Browsers never send a Referer
 *    from a file:// origin. The Android app avoids this by serving its assets
 *    over https via WebViewAssetLoader, so OSM works there too; the Esri
 *    fallback in resolveStreet() now only covers an HTML file opened directly
 *    from disk, which has no origin to send.
 *
 *  - Esri ArcGIS REST basemaps need no key and work without a Referer, which
 *    is why the Satellite layer has always worked inside the app.
 *
 * @module MapConfig
 */
window.MapConfig = {
    /**
     * Tile definitions. `street` is chosen at runtime by resolveStreet().
     * @type {Object<string, {url: string, maxNativeZoom: (number|undefined), attribution: string}>}
     */
    tiles: {
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maxNativeZoom: undefined,
            attribution: 'Tiles &copy; Esri'
        },
        // Preferred street map: richest detail (landcover, trails, place labels).
        // Only usable where the browser will send a Referer.
        osm: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxNativeZoom: undefined,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        // Referer-free fallback for file:// origins (Android app, local testing).
        esriStreet: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            maxNativeZoom: undefined,
            attribution: 'Tiles &copy; Esri'
        },
        // Contour + hillshade topo, useful for mountain flying. Serves without a
        // Referer. Volunteer-run hobby project with no uptime guarantee, so it is
        // an opt-in layer rather than a default.
        topo: {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            maxNativeZoom: 17,
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
        }
    },

    /**
     * True when the page origin will cause a Referer header to be sent.
     * file:, content: and android_asset origins send none.
     * @returns {boolean} Whether outgoing tile requests will carry a Referer.
     */
    sendsReferer: function () {
        return location.protocol === 'http:' || location.protocol === 'https:';
    },

    /**
     * Picks the street basemap that actually works in the current context.
     * @returns {{url: string, maxNativeZoom: (number|undefined), attribution: string}} Tile definition.
     */
    resolveStreet: function () {
        return this.sendsReferer() ? this.tiles.osm : this.tiles.esriStreet;
    },

    /**
     * Initializes and returns default base layers for the Leaflet map instance.
     * @param {L.Map} leafletMap - The target Leaflet map instance.
     * @returns {{defaultLayer: L.TileLayer, roadLayer: L.TileLayer, baseLayers: Object<string, L.Layer>}} Layer configuration object.
     */
    initLayers: function (leafletMap) {
        const mk = (def) => L.tileLayer(def.url, {
            maxZoom: 19,
            maxNativeZoom: def.maxNativeZoom,
            attribution: def.attribution
        });

        const satellite = mk(this.tiles.satellite);
        const street = mk(this.resolveStreet());
        const topo = mk(this.tiles.topo);

        satellite.addTo(leafletMap);

        const offlineGrid = L.gridLayer.gridPattern();

        return {
            defaultLayer: satellite,
            roadLayer: street,
            baseLayers: {
                "Satellite": satellite,
                "Street": street,
                "Topo": topo,
                "Offline Grid": offlineGrid
            }
        };
    },

    /**
     * Theme hook. The street basemap is deliberately the same bright map in
     * both light and dark themes, so this is a no-op; it exists so tool pages
     * can call it unconditionally and so a themed variant can be added later
     * without touching every tool.
     * @param {L.TileLayer} roadLayer - The street layer returned by initLayers.
     * @param {string} theme - Either 'light' or 'dark'. Ignored.
     * @returns {void}
     */
    setRoadTheme: function (roadLayer, theme) {
        /* Intentionally empty - see doc comment. */
    }
};
