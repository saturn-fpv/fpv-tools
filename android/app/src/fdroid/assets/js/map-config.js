window.MapConfig = {
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
