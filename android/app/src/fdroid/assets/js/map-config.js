window.MapConfig = {
    initLayers: function(leafletMap) {
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        osm.addTo(leafletMap);
        
        const offlineGrid = L.gridLayer.gridPattern();

        return {
            defaultLayer: osm,
            roadLayer: osm,
            baseLayers: {
                "OpenStreetMap": osm,
                "Tactical Grid (Offline)": offlineGrid
            }
        };
    }
};
