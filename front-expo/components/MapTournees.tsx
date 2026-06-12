import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import type { Arret } from '../services/chauffeur';

export interface MapStop {
  lat: number;
  lon: number;
  label: string;
  statut: Arret['statut'];
  ordre: number;
}

export interface MapVehicle {
  vehiculeIndex: number;
  label: string;
  stops: MapStop[];
}

interface Props {
  vehicles: MapVehicle[];
  selectedStop?: { lat: number; lon: number } | null;
  height?: number;
}

const VEHICLE_COLORS = ['#2D6A4F', '#1A759F', '#9B59B6', '#E67E22', '#E76F51'];

function buildHtml(vehicles: MapVehicle[]): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
    .popup-title{font-weight:700;font-size:13px;color:#1B2D27;font-family:-apple-system,sans-serif}
    .popup-sub{font-size:11px;color:#6B8F7E;margin-top:3px;font-family:-apple-system,sans-serif}
    .leaflet-popup-content-wrapper{border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15);border:none}
    .leaflet-popup-content{margin:10px 14px}
    .leaflet-popup-tip{background:white}
    #filters{
      position:absolute;top:10px;left:50%;transform:translateX(-50%);
      z-index:1000;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:92%
    }
    .chip{
      padding:5px 13px;border-radius:20px;font-size:11px;font-weight:700;
      cursor:pointer;border:none;font-family:-apple-system,sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,0.18);transition:all 0.2s;color:white
    }
    .chip.dimmed{opacity:0.35;transform:scale(0.95)}
  </style>
</head>
<body>
<div id="map"></div>
<div id="filters"></div>
<script>
  var vehicles = ${JSON.stringify(vehicles)};
  var vColors = ${JSON.stringify(VEHICLE_COLORS)};
  var sLabels = {en_attente:'En attente',en_cours:'En cours',terminee:'Terminé ✓',erreur:'Erreur ✗'};

  var map = L.map('map',{zoomControl:true}).setView([43.15,6.05],10);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    attribution:'© OSM © CARTO',subdomains:'abcd',maxZoom:19
  }).addTo(map);

  var routeLayers = [];
  var markerGroups = [];
  var activeFilter = -1;
  var allMarkersMap = {};
  var pulseLayer = null;

  // ── Markers par véhicule ──────────────────────────────────────────
  vehicles.forEach(function(v, vi) {
    var c = vColors[vi % vColors.length];
    var group = L.layerGroup().addTo(map);
    markerGroups.push(group);
    routeLayers.push(null);

    v.stops.forEach(function(s, si) {
      var num = s.ordre || (si + 1);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">'
        + '<ellipse cx="15" cy="37" rx="7" ry="3" fill="rgba(0,0,0,0.15)"/>'
        + '<path d="M15 1C8.4 1 3 6.4 3 13c0 9.5 12 25 12 25S27 22.5 27 13C27 6.4 21.6 1 15 1Z" fill="' + c + '" stroke="white" stroke-width="2.5"/>'
        + '<circle cx="15" cy="13" r="6.5" fill="white" opacity="0.92"/>'
        + '<text x="15" y="17.5" text-anchor="middle" font-size="8" font-weight="700" fill="' + c + '" font-family="sans-serif">' + num + '</text>'
        + '</svg>';
      var icon = L.divIcon({html:svg,className:'',iconSize:[30,40],iconAnchor:[15,38],popupAnchor:[0,-36]});
      var mk = L.marker([s.lat, s.lon], {icon:icon})
        .bindPopup('<div class="popup-title">' + s.label + '</div><div class="popup-sub">' + (sLabels[s.statut] || s.statut) + '</div>');
      mk.addTo(group);
      allMarkersMap[s.lat + ',' + s.lon] = mk;
    });
  });

  // ── Routes OSRM ───────────────────────────────────────────────────
  vehicles.forEach(function(v, vi) {
    if (v.stops.length < 2) return;
    var c = vColors[vi % vColors.length];
    var coords = v.stops.map(function(s){ return s.lon + ',' + s.lat; }).join(';');

    fetch('https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=full&geometries=geojson')
      .then(function(r){ return r.json(); })
      .then(function(data) {
        if (!data.routes || !data.routes[0]) throw new Error('no route');
        var layer = L.geoJSON(data.routes[0].geometry, {
          style: {color:c, weight:4, opacity:0.75}
        }).addTo(map);
        routeLayers[vi] = layer;
      })
      .catch(function() {
        // Fallback lignes droites si OSRM indisponible
        var pts = v.stops.map(function(s){ return [s.lat, s.lon]; });
        var layer = L.polyline(pts, {color:c, weight:3, opacity:0.6, dashArray:'6,4'}).addTo(map);
        routeLayers[vi] = layer;
      });
  });

  // ── Fit bounds ─────────────────────────────────────────────────────
  var allPts = [];
  vehicles.forEach(function(v){ v.stops.forEach(function(s){ allPts.push([s.lat, s.lon]); }); });
  if (allPts.length > 0) {
    map.fitBounds(L.latLngBounds(allPts).pad(0.25));
  }

  // ── Chips de filtre ────────────────────────────────────────────────
  var filtersEl = document.getElementById('filters');
  vehicles.forEach(function(v, vi) {
    if (v.stops.length === 0) return;
    var c = vColors[vi % vColors.length];
    var chip = document.createElement('button');
    chip.className = 'chip';
    chip.id = 'chip-' + vi;
    chip.textContent = v.label + ' (' + v.stops.length + ')';
    chip.style.backgroundColor = c;
    chip.onclick = function(){ filterVehicle(vi); };
    filtersEl.appendChild(chip);
  });

  function filterVehicle(idx) {
    if (activeFilter === idx) {
      activeFilter = -1;
      routeLayers.forEach(function(l){ if (l) l.setStyle({opacity:0.75}); });
      markerGroups.forEach(function(g){ g.eachLayer(function(l){ if (l.setOpacity) l.setOpacity(1); }); });
      document.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('dimmed'); });
    } else {
      activeFilter = idx;
      routeLayers.forEach(function(l, i){ if (l) l.setStyle({opacity: i === idx ? 0.85 : 0.1}); });
      markerGroups.forEach(function(g, i){
        g.eachLayer(function(l){ if (l.setOpacity) l.setOpacity(i === idx ? 1 : 0.15); });
      });
      document.querySelectorAll('.chip').forEach(function(c) {
        var chipIdx = parseInt(c.id.replace('chip-', ''));
        if (chipIdx === idx) c.classList.remove('dimmed');
        else c.classList.add('dimmed');
      });
    }
  }

  // ── Zoom vers un arrêt (appelé depuis React Native) ───────────────
  function zoomToStop(lat, lon) {
    if (pulseLayer) { map.removeLayer(pulseLayer); pulseLayer = null; }
    map.setView([lat, lon], 15, {animate:true, duration:0.8});
    var key = lat + ',' + lon;
    if (allMarkersMap[key]) {
      setTimeout(function(){ allMarkersMap[key].openPopup(); }, 500);
    }
    pulseLayer = L.circle([lat, lon], {
      radius:80, color:'#F39C12', fillColor:'#F39C12', fillOpacity:0.25, weight:2
    }).addTo(map);
    setTimeout(function(){ if (pulseLayer){ map.removeLayer(pulseLayer); pulseLayer = null; } }, 3500);
  }

  window.zoomToStop = zoomToStop;
  window.filterVehicle = filterVehicle;
</script>
</body>
</html>`;
}

export default function MapTournees({ vehicles, selectedStop, height = 340 }: Props) {
  const webViewRef = useRef<any>(null);

  // Injection JS quand l'utilisateur clique un arrêt dans une VehicleCard
  useEffect(() => {
    if (!selectedStop || !webViewRef.current) return;
    const js = `zoomToStop(${selectedStop.lat}, ${selectedStop.lon}); true;`;
    webViewRef.current.injectJavaScript(js);
  }, [selectedStop]);

  const html = useMemo(() => buildHtml(vehicles), [vehicles]);

  const totalStops = vehicles.reduce((acc, v) => acc + v.stops.length, 0);

  if (Platform.OS === 'web') {
    return (
      <View style={[s.fallback, { height }]}>
        <Ionicons name="map-outline" size={28} color={colors.primaryLight} />
        <Text style={s.fallbackTitle}>Carte disponible sur mobile</Text>
        <Text style={s.fallbackSub}>
          {totalStops} arrêt{totalStops !== 1 ? 's' : ''} · {vehicles.length} véhicule{vehicles.length !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  }

  const { WebView } = require('react-native-webview');

  return (
    <View style={[s.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={s.webview}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8F5EE',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fallback: {
    borderRadius: 16,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D1E9DC',
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  fallbackSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
