import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import StopCard, { type Stop } from '../components/StopCard';

// Données hardcodées — à remplacer par getTournee(user_id, date) quand le back sera prêt
const DRIVER = { name: 'Marc Dubois', vehicule: 'VL1', maxKg: 750 };

const INITIAL_STOPS: Stop[] = [
  { id: 1, ordre: 1, nom: "McDonald's Toulon Mayol", ville: 'Toulon', poidsPrevu: 120 },
  { id: 2, ordre: 2, nom: 'Hôtel Ibis Hyères Centre', ville: 'Hyères', poidsPrevu: 85 },
  { id: 3, ordre: 3, nom: 'Collège Beaussier', ville: 'La Seyne-sur-Mer', poidsPrevu: 145 },
  { id: 4, ordre: 4, nom: 'Carrefour Market Toulon', ville: 'Toulon', poidsPrevu: 200 },
  { id: 5, ordre: 5, nom: 'Restaurant Le Langoustier', ville: 'Porquerolles', poidsPrevu: 60 },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DriverScreen() {
  const router = useRouter();
  const [stops, setStops] = useState<Stop[]>(INITIAL_STOPS);
  const [collectedKg, setCollectedKg] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const total = INITIAL_STOPS.length;
  const done = total - stops.length;
  const progressPct = Math.round((done / total) * 100);

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleValidate(stop: Stop) {
    setStops(prev => prev.filter(s => s.id !== stop.id));
    setCollectedKg(prev => prev + stop.poidsPrevu);
    showToast(`✓ ${stop.nom} validé`);
  }

  function handleSkip(stop: Stop) {
    setStops(prev => prev.filter(s => s.id !== stop.id));
    showToast(`↷ ${stop.nom} reporté aux imprévus`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <LinearGradient
            colors={[colors.primaryLight, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.avatar}
          >
            <Text style={s.avatarText}>{DRIVER.name[0]}</Text>
          </LinearGradient>
          <View>
            <Text style={s.driverName}>{DRIVER.name}</Text>
            <Text style={s.driverSub}>Chauffeur · {DRIVER.vehicule} · max {DRIVER.maxKg} kg</Text>
          </View>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={() => router.replace('/')}>
          <Ionicons name="log-out-outline" size={20} color={colors.coral} />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={s.progressLabelRow}>
          <Text style={s.progressLabel}>{done} / {total} collectes</Text>
          <Text style={s.progressKg}>{collectedKg} kg collectés</Text>
        </View>
        <View style={s.progressBarBg}>
          <View style={[s.progressBarFill, { width: `${progressPct}%` as any }]} />
        </View>
      </View>

      {/* Content */}
      {stops.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
          </View>
          <Text style={s.emptyTitle}>Tournée terminée !</Text>
          <Text style={s.emptySubtitle}>
            {done} collecte{done !== 1 ? 's' : ''} · {collectedKg} kg collectés
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.listHeader}>
            <Text style={s.listTitle}>File de collecte</Text>
            <View style={s.listCount}>
              <Text style={s.listCountText}>
                {stops.length} arrêt{stops.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {stops.map((stop, i) => (
            <StopCard
              key={stop.id}
              stop={stop}
              isFirst={i === 0}
              onValidate={() => handleValidate(stop)}
              onSkip={() => handleSkip(stop)}
            />
          ))}
        </ScrollView>
      )}

      {/* Toast */}
      {toast && (
        <Animated.View style={[s.toast, { opacity: toastOpacity }]}>
          <Text style={s.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EC',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  driverSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.coralLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.2)',
  },

  // Progress
  progressWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EC',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  progressKg: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#EAF2EE',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 99,
  },

  // List
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  listCount: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EAF2EE',
  },
  listCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 80,
    right: 20,
    left: 20,
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
