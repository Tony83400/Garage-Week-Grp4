import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Pressable,
  Animated, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import type { Arret } from '../services/chauffeur';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const VEHICLE_COLORS = [
  colors.primaryLight,
  colors.secondary,
  colors.accent,
  '#9B59B6',
  '#E67E22',
];

interface Props {
  index: number;
  chauffeurId: number;
  chauffeurNom: string;
  heureDepart?: string;
  arrets: Arret[];
  capaciteMaxKg?: number;
  animDelay?: number;
  onExport: () => void;
  onStopPress?: (lat: number, lon: number, clientNom: string) => void;
}

function StatutBadge({ statut }: { statut: Arret['statut'] }) {
  const labels: Record<string, string> = {
    terminee:   '✓ Fait',
    en_cours:   '⟳ En cours',
    en_attente: 'En attente',
    planifiee:  '· Planifié',
    erreur:     '✗ Erreur',
  };
  const theme = colors.status[statut as keyof typeof colors.status]
    ?? { bg: colors.background, fg: colors.textMuted, border: '#D4E0DC' };

  return (
    <View style={[s.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <Text style={[s.badgeText, { color: theme.fg }]}>{labels[statut] ?? statut}</Text>
    </View>
  );
}

export default function VehicleCard({
  index, chauffeurId, chauffeurNom, heureDepart, arrets,
  capaciteMaxKg = 750, animDelay = 0, onExport, onStopPress,
}: Props) {
  const [expanded, setExpanded] = useState(index === 0);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: animDelay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: animDelay, useNativeDriver: true }),
    ]).start();
  }, []);

  function toggleExpand() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  }

  const vehicleColor = VEHICLE_COLORS[index % VEHICLE_COLORS.length];
  const vehicleLabel = `VL${index + 1}`;

  const chargeTotaleKg = arrets.reduce((acc, a) => acc + (a.poids_prevu_kg ?? 0), 0);
  const chargeActuelleKg = arrets
    .filter(a => a.statut === 'terminee')
    .reduce((acc, a) => acc + (a.poids_prevu_kg ?? 0), 0);

  const fillPct = Math.min(Math.round((chargeActuelleKg / capaciteMaxKg) * 100), 100);
  const isOverload = chargeActuelleKg >= capaciteMaxKg * 0.95;

  return (
    <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <TouchableOpacity style={s.header} onPress={toggleExpand} activeOpacity={0.75}>
        <View style={s.headerLeft}>
          <View style={[s.vehicleTag, { backgroundColor: vehicleColor + '22' }]}>
            <Text style={[s.vehicleTagText, { color: vehicleColor }]}>{vehicleLabel}</Text>
          </View>
          <View>
            <Text style={s.chauffeurNom}>{chauffeurNom}</Text>
            <Text style={s.vehiculeInfo}>VL · max {capaciteMaxKg} kg</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.exportBtn} onPress={onExport} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={12} color="#fff" />
            <Text style={s.exportBtnText}>BlueBob</Text>
          </TouchableOpacity>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {/* Meta strip */}
      <View style={s.metaStrip}>
        <View style={[s.metaItem, s.metaBorder]}>
          <Text style={s.metaValue}>{arrets.length}</Text>
          <Text style={s.metaLabel}>Arrêts</Text>
        </View>
        <View style={[s.metaItem, s.metaBorder]}>
          <Text style={s.metaValue}>≈ {chargeTotaleKg} kg</Text>
          <Text style={s.metaLabel}>Prévu</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={s.metaValue}>{heureDepart ?? '–'}</Text>
          <Text style={s.metaLabel}>Départ</Text>
        </View>
      </View>

      {/* Weight bar */}
      <View style={s.weightWrap}>
        <View style={s.weightLabelRow}>
          <Text style={s.weightLabel}>Charge actuelle estimée</Text>
          <Text style={[s.weightValue, isOverload && { color: colors.status.en_cours.fg }]}>
            {chargeActuelleKg} / {capaciteMaxKg} kg{isOverload ? ' ⚠' : ''}
          </Text>
        </View>
        <View style={s.weightBarBg}>
          <View
            style={[
              s.weightBarFill,
              { width: `${fillPct}%` as any, backgroundColor: isOverload ? colors.status.en_cours.fg : vehicleColor },
            ]}
          />
        </View>
      </View>

      {/* Stops list */}
      {expanded && (
        <View style={s.stopsList}>
          {arrets.length === 0 ? (
            <Text style={s.emptyStops}>Aucun arrêt planifié</Text>
          ) : (
            arrets.map((a, i) => (
              <Pressable
                key={a.tache_id}
                style={({ pressed }) => [s.stopItem, i > 0 && s.stopDivider, pressed && s.stopPressed]}
                onPress={() => a.latitude && a.longitude && onStopPress?.(a.latitude, a.longitude, a.client_nom)}
              >
                <View style={s.stopNum}>
                  <Text style={s.stopNumText}>{a.ordre ?? i + 1}</Text>
                </View>
                <View style={s.stopContent}>
                  <Text style={s.stopName} numberOfLines={1}>{a.client_nom}</Text>
                  {a.heure_estimee && (
                    <Text style={s.stopTime}>{a.heure_estimee}</Text>
                  )}
                </View>
                <StatutBadge statut={a.statut} />
                {a.latitude && a.longitude && (
                  <Ionicons name="location-outline" size={13} color={colors.accentLight} />
                )}
              </Pressable>
            ))
          )}
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vehicleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vehicleTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chauffeurNom: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  vehiculeInfo: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  metaStrip: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  metaBorder: {
    borderRightWidth: 1,
    borderRightColor: '#EAF2EE',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  weightWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  weightLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weightLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  weightValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  weightBarBg: {
    height: 6,
    backgroundColor: '#EAF2EE',
    borderRadius: 99,
    overflow: 'hidden',
  },
  weightBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  stopsList: {
    borderTopWidth: 1,
    borderTopColor: '#EAF2EE',
    paddingBottom: 4,
  },
  emptyStops: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  stopPressed: {
    backgroundColor: '#F0F7F4',
  },
  stopDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F0F7F4',
  },
  stopNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  stopContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stopName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  stopTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
