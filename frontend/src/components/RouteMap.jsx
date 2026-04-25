import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';

// Fix Leaflet default marker icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STOP_COLORS = {
  pickup:  '#e8a020',
  dropoff: '#c44b2a',
  fuel:    '#4a7c5f',
  rest:    '#565c78',
  break:   '#3d4255',
};

const STOP_ICONS = {
  pickup:  '▲',
  dropoff: '▼',
  fuel:    '⛽',
  rest:    '🛏',
  break:   '⏸',
};

function fmtHr(h) {
  const hh = Math.floor(h % 24).toString().padStart(2, '0');
  const mm = Math.round((h % 1) * 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function RouteMap({ route, stops }) {
  const mapRef     = useRef(null);
  const mapInstRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mapInstRef.current) {
        mapInstRef.current.remove();
        mapInstRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!route) return;

    // Destroy existing map before re-creating
    if (mapInstRef.current) {
      mapInstRef.current.remove();
      mapInstRef.current = null;
    }

    if (!mapRef.current) return;

    const center = route.waypoints?.[0]
      ? [route.waypoints[0].coordinates[1], route.waypoints[0].coordinates[0]]
      : [39.5, -98.35];

    const map = L.map(mapRef.current, { center, zoom: 5, zoomControl: true });
    mapInstRef.current = map;

    // Dark CartoDB tile layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap contributors © CARTO', subdomains: 'abcd', maxZoom: 19 }
    ).addTo(map);

    // Route polyline
    if (route.coordinates?.length > 1) {
      const latlngs = route.coordinates.map(([lon, lat]) => [lat, lon]);
      const poly = L.polyline(latlngs, { color: '#e8a020', weight: 3.5, opacity: 0.9 }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [48, 48] });
    }

    // Waypoint markers: origin, pickup, dropoff
    const wpColors = ['#4a7c5f', '#e8a020', '#c44b2a'];
    const wpLabels = ['START', 'PICKUP', 'DROPOFF'];
    route.waypoints?.forEach((wp, i) => {
      const [lon, lat] = wp.coordinates;
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-marker-wp" style="background:${wpColors[i]}">${wpLabels[i]}</div>`,
        iconAnchor: [0, 20],
      });
      L.marker([lat, lon], { icon })
        .bindPopup(`<strong>${wpLabels[i]}</strong><br/>${wp.name}`)
        .addTo(map);
    });

    // Stop markers
    stops?.forEach(stop => {
      if (!stop.coordinates) return;
      const [lon, lat] = stop.coordinates;
      if (!lat || !lon) return;
      const color = STOP_COLORS[stop.type] || '#aaa';
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-marker-stop" style="border-color:${color}" title="${stop.label}">
                 <span style="color:${color}">${STOP_ICONS[stop.type] || '●'}</span>
               </div>`,
        iconSize:   [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([lat, lon], { icon })
        .bindPopup(
          `<div>
            <strong>${stop.label}</strong><br/>
            Day ${stop.day} · ${fmtHr(stop.hour_start)}–${fmtHr(stop.hour_end)}<br/>
            Mile ${stop.miles.toFixed(0)}
          </div>`
        )
        .addTo(map);
    });
  }, [route, stops]);

  const presentTypes = [...new Set((stops || []).map(s => s.type))];

  return (
    <div className="route-map-wrapper">
      <div className="map-legend">
        {[
          { label: 'Origin',  color: '#4a7c5f' },
          { label: 'Pickup',  color: '#e8a020' },
          { label: 'Dropoff', color: '#c44b2a' },
        ].map(l => (
          <div className="legend-item" key={l.label}>
            <span className="legend-dot" style={{ background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
        {presentTypes.filter(t => !['pickup','dropoff'].includes(t)).map(t => (
          <div className="legend-item" key={t}>
            <span className="legend-dot" style={{ background: STOP_COLORS[t] || '#aaa' }} />
            <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
          </div>
        ))}
      </div>

      <div ref={mapRef} className="map-container" />

      {route && (
        <div className="map-stats">
          <div className="map-stat">
            <span className="map-stat-val">{route.distance_miles?.toFixed(0)}</span>
            <span className="map-stat-label">MILES</span>
          </div>
          <div className="map-stat-sep">·</div>
          <div className="map-stat">
            <span className="map-stat-val">{(stops||[]).filter(s=>s.type==='rest').length}</span>
            <span className="map-stat-label">REST STOPS</span>
          </div>
          <div className="map-stat-sep">·</div>
          <div className="map-stat">
            <span className="map-stat-val">{(stops||[]).filter(s=>s.type==='fuel').length}</span>
            <span className="map-stat-label">FUEL STOPS</span>
          </div>
          <div className="map-stat-sep">·</div>
          <div className="map-stat">
            <span className="map-stat-val">{(stops||[]).filter(s=>s.type==='break').length}</span>
            <span className="map-stat-label">BREAKS</span>
          </div>
        </div>
      )}
    </div>
  );
}
