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
  heureFin?: string;
  immatriculation?: string;
  arrets: Arret[];
  capaciteMaxKg?: number;
  animDelay?: number;
  onExport: () => void;
  onStopPress?: (lat: number, lon: number, clientNom: string) => void;
}

function getInitials(nom: string): string {
  const parts = nom.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return nom.slice(0, 2).toUpperCase();
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

function getDotStyle(statut: Arret['statut']) {
  const filled = statut === 'terminee' || statut === 'en_cours' || statut === 'erreur';
  const color = colors.status[statut as keyof typeof colors.status]?.fg ?? colors.textMuted;
  return { filled, color };
}

export default function VehicleCard({
  index, chauffeurId, chauffeurNom, heureDepart, heureFin, immatriculation, arrets,
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
  const initials     = getInitials(chauffeurNom);

  const done            = arrets.filter(a => a.statut === 'terminee').length;
  const chargeActuelleKg = arrets
    .filter(a => a.statut === 'terminee')
    .reduce((acc, a) => acc + (a.poids_prevu_kg ?? 0), 0);
  const chargeTotaleKg  = arrets.reduce((acc, a) => acc + (a.poids_prevu_kg ?? 0), 0);
  const plannedPct      = capaciteMaxKg > 0 ? Math.min(Math.round((chargeTotaleKg / capaciteMaxKg) * 100), 100) : 0;
  const collectedPct    = capaciteMaxKg > 0 ? Math.min(Math.round((chargeActuelleKg / capaciteMaxKg) * 100), 100) : 0;
  const isOverload      = plannedPct >= 95;
  const hasCollected    = chargeActuelleKg > 0;

  const barColor = plannedPct > 90 ? colors.coral : plannedPct > 70 ? colors.accent : vehicleColor;

  const progressColor = done === arrets.length && arrets.length > 0
    ? colors.status.terminee.fg
    : done > 0
      ? colors.status.en_cours.fg
      : colors.textMuted;

  return (
    <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

      {/* Bande couleur gauche */}
      <View style={[s.colorStrip, { backgroundColor: vehicleColor }]} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <TouchableOpacity style={s.header} onPress={toggleExpand} activeOpacity={0.75}>

        {/* Avatar + VL tag */}
        <View style={s.avatarCol}>
          <View style={[s.avatarCircle, { backgroundColor: vehicleColor + '1A', borderColor: vehicleColor + '50' }]}>
            <Text style={[s.avatarInitials, { color: vehicleColor }]}>{initials}</Text>
          </View>
          <View style={[s.vlTag, { backgroundColor: vehicleColor + '15' }]}>
            <Text style={[s.vlTagText, { color: vehicleColor }]}>{vehicleLabel}</Text>
          </View>
        </View>

        {/* Infos chauffeur */}
        <View style={s.headerInfo}>
          <Text style={s.chauffeurNom} numberOfLines={1}>{chauffeurNom}</Text>
          <View style={s.vehicleInfoRow}>
            {immatriculation ? (
              <>
                <Ionicons name="car-outline" size={11} color={colors.textMuted} />
                <Text style={s.departText}>{immatriculation}</Text>
                <Text style={s.departSep}>·</Text>
              </>
            ) : null}
            <Ionicons name="time-outline" size={11} color={colors.textMuted} />
            <Text style={s.departText}>
              {heureDepart && heureDepart !== '–' ? heureDepart : '–'}
              {heureFin && heureFin !== '–' ? ` → ${heureFin}` : ''}
            </Text>
          </View>
        </View>

        {/* Droite : progression + export + chevron */}
        <View style={s.headerRight}>
          <View style={[s.progressBadge, { backgroundColor: progressColor + '18', borderColor: progressColor + '40' }]}>
            <Text style={[s.progressText, { color: progressColor }]}>{done}/{arrets.length}</Text>
          </View>
          <TouchableOpacity style={s.exportBtn} onPress={onExport} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={12} color="#fff" />
            <Text style={s.exportBtnText}>BlueBob</Text>
          </TouchableOpacity>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {/* ── Meta strip ─────────────────────────────────────────── */}
      <View style={s.metaStrip}>
        <View style={[s.metaItem, s.metaBorder]}>
          <Text style={s.metaValue}>{arrets.length}</Text>
          <Text style={s.metaLabel}>Arrêts</Text>
        </View>
        <View style={[s.metaItem, s.metaBorder]}>
          <Text style={s.metaValue}>≈ {chargeTotaleKg} kg</Text>
          <Text style={s.metaLabel}>Charge prévue</Text>
        </View>
        <View style={s.metaItem}>
          <Text style={[s.metaValue, { color: barColor }]}>{plannedPct}%</Text>
          <Text style={s.metaLabel}>Capacité</Text>
        </View>
      </View>

      {/* ── Barre de charge ────────────────────────────────────── */}
      <View style={s.weightWrap}>
        <View style={s.weightLabelRow}>
          <Text style={s.weightLabel}>
            {hasCollected ? 'Collecté / Prévu' : 'Capacité camion'}
          </Text>
          <Text style={[s.weightValue, { color: hasCollected ? colors.status.terminee.fg : barColor }]}>
            {hasCollected
              ? `${chargeActuelleKg} / ${chargeTotaleKg} kg`
              : `${chargeTotaleKg} / ${capaciteMaxKg} kg${isOverload ? ' ⚠' : ''}`
            }
          </Text>
        </View>
        <View style={s.weightBarBg}>
          <View style={[s.weightBarPlanned, { width: `${plannedPct}%` as any, backgroundColor: barColor + '40' }]} />
          {collectedPct > 0 && (
            <View style={[s.weightBarCollected, { width: `${collectedPct}%` as any, backgroundColor: colors.status.terminee.fg }]} />
          )}
        </View>
      </View>

      {/* ── Liste des arrêts (timeline) ─────────────────────────── */}
      {expanded && (
        <View style={s.stopsList}>
          {/* Ligne verticale absolue */}
          <View style={[s.timelineAbsLine, { backgroundColor: vehicleColor + '28' }]} />

          {arrets.length === 0 ? (
            <Text style={s.emptyStops}>Aucun arrêt planifié</Text>
          ) : (
            arrets.map((a, i) => {
              const { filled, color: dotColor } = getDotStyle(a.statut);
              return (
                <Pressable
                  key={a.tache_id}
                  style={({ pressed }) => [s.stopItem, pressed && s.stopPressed]}
                  onPress={() => a.latitude && a.longitude && onStopPress?.(a.latitude, a.longitude, a.client_nom)}
                >
                  {/* Point de timeline */}
                  <View style={s.timelineDotWrap}>
                    <View style={[
                      s.timelineDot,
                      filled
                        ? { backgroundColor: dotColor, borderColor: dotColor }
                        : { backgroundColor: colors.card, borderColor: vehicleColor + '70' },
                    ]}>
                      <Text style={[s.timelineDotNum, { color: filled ? '#fff' : vehicleColor }]}>
                        {a.ordre ?? i + 1}
                      </Text>
                    </View>
                  </View>

                  {/* Contenu */}
                  <View style={s.stopContent}>
                    <Text style={[s.stopName, (a.type_imprevu === 'integre_dynamiquement' || a.type_imprevu === 'replanifie') && { color: '#27AE60' }]} numberOfLines={1}>
                      {a.client_nom} { (a.type_imprevu === 'integre_dynamiquement' || a.type_imprevu === 'replanifie') ? '✨' : ''}
                    </Text>
                    {a.heure_estimee && <Text style={s.stopTime}>{a.heure_estimee}</Text>}
                  </View>

                  <StatutBadge statut={a.statut} />

                  {a.latitude && a.longitude && (
                    <Ionicons name="location-outline" size={13} color={colors.accentLight} />
                  )}
                </Pressable>
              );
            })
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
    position: 'relative',
  },
  colorStrip: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    zIndex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
    gap: 12,
  },
  avatarCol: {
    alignItems: 'center',
    gap: 5,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  vlTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vlTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  chauffeurNom: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  departRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  departText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  departSep: {
    fontSize: 12,
    color: colors.textMuted,
    opacity: 0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
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

  // Meta strip
  metaStrip: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
    marginLeft: 4,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
  },
  metaBorder: {
    borderRightWidth: 1,
    borderRightColor: '#EAF2EE',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 3,
  },

  // Barre de charge
  weightWrap: {
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 14,
    marginLeft: 4,
  },
  weightLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  weightLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  weightValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  weightBarBg: {
    height: 8,
    backgroundColor: '#EAF2EE',
    borderRadius: 99,
    overflow: 'hidden',
    position: 'relative',
  },
  weightBarPlanned: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 99,
  },
  weightBarCollected: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 99,
  },

  // Timeline
  stopsList: {
    borderTopWidth: 1,
    borderTopColor: '#EAF2EE',
    paddingBottom: 4,
    marginLeft: 4,
    position: 'relative',
  },
  timelineAbsLine: {
    position: 'absolute',
    left: 26,
    top: 0,
    bottom: 0,
    width: 2,
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
    paddingLeft: 14,
    paddingRight: 14,
    paddingVertical: 10,
  },
  stopPressed: {
    backgroundColor: '#F0F7F4',
  },
  timelineDotWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotNum: {
    fontSize: 10,
    fontWeight: '800',
  },
  stopContent: {
    flex: 1,
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
