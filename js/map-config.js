window.MapConfig = {
    initLayers: function(leafletMap) {
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Esri Satellite'
        });
        
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        satellite.addTo(leafletMap);
        
        const offlineGrid = L.gridLayer.gridPattern();

        return {
            defaultLayer: satellite,
            roadLayer: osm,
            baseLayers: {
                "Satellite": satellite,
                "OpenStreetMap": osm,
                "Tactical Grid (Offline)": offlineGrid
            }
        };
    }
};
