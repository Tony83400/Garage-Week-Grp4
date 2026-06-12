import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import type { Arret } from '../services/chauffeur';

export interface MapMarker {
  lat: number;
  lon: number;
  label: string;
  statut: Arret['statut'];
  vehiculeIndex: number;
}

interface Props {
  markers: MapMarker[];
  height?: number;
}

const VEHICLE_COLORS = [
  '#2D6A4F',
  '#1A759F',
  '#9B59B6',
  '#E67E22',
  '#E76F51',
];

function buildHtml(markers: MapMarker[]): string {
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
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var data = ${JSON.stringify(markers)};
  var vColors = ${JSON.stringify(VEHICLE_COLORS)};
  var sLabels = {en_attente:'En attente',en_cours:'En cours',terminee:'Terminé ✓',erreur:'Erreur ✗'};

  var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([43.15, 6.05], 10);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org">OSM</a> © <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  var lmarkers = [];
  data.forEach(function(m, i) {
    var c = vColors[m.vehiculeIndex % vColors.length];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">'
      + '<ellipse cx="15" cy="37" rx="7" ry="3" fill="rgba(0,0,0,0.15)"/>'
      + '<path d="M15 1C8.4 1 3 6.4 3 13c0 9.5 12 25 12 25S27 22.5 27 13C27 6.4 21.6 1 15 1Z" fill="' + c + '" stroke="white" stroke-width="2.5"/>'
      + '<circle cx="15" cy="13" r="6.5" fill="white" opacity="0.92"/>'
      + '<text x="15" y="17.5" text-anchor="middle" font-size="8.5" font-weight="700" fill="' + c + '" font-family="sans-serif">' + (i + 1) + '</text>'
      + '</svg>';

    var icon = L.divIcon({
      html: svg,
      className: '',
      iconSize: [30, 40],
      iconAnchor: [15, 38],
      popupAnchor: [0, -36]
    });

    var mk = L.marker([m.lat, m.lon], { icon: icon })
      .bindPopup(
        '<div class="popup-title">' + m.label + '</div>'
        + '<div class="popup-sub">' + (sLabels[m.statut] || m.statut) + '</div>'
      );
    mk.addTo(map);
    lmarkers.push(mk);
  });

  if (lmarkers.length > 0) {
    var group = L.featureGroup(lmarkers);
    map.fitBounds(group.getBounds().pad(0.25));
  }
</script>
</body>
</html>`;
}

export default function MapTournees({ markers, height = 320 }: Props) {
  if (markers.length === 0) {
    return (
      <View style={[s.empty, { height }]}>
        <Ionicons name="map-outline" size={28} color={colors.primaryLight} />
        <Text style={s.emptyTitle}>Carte des tournées — Var (83)</Text>
        <Text style={s.emptySub}>Aucune tournée chargée pour cette date</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[s.empty, { height }]}>
        <Ionicons name="map-outline" size={28} color={colors.primaryLight} />
        <Text style={s.emptyTitle}>Carte disponible sur mobile</Text>
        <Text style={s.emptySub}>{markers.length} arrêt{markers.length !== 1 ? 's' : ''} chargé{markers.length !== 1 ? 's' : ''}</Text>
      </View>
    );
  }

  // Lazy require pour éviter les erreurs sur web
  const { WebView } = require('react-native-webview');

  return (
    <View style={[s.container, { height }]}>
      <WebView
        source={{ html: buildHtml(markers) }}
        style={s.webview}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
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
  empty: {
    borderRadius: 16,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D1E9DC',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
