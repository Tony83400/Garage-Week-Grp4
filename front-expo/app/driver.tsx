import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../constants/colors';
import StopCard from '../components/StopCard';
import { StyleSheet } from 'react-native';
import { getTournee, updateStatutTache, type TourneeDetails, type Arret } from '../services/chauffeur';

const DATE_DEMO = new Date().toISOString().split('T')[0];

export default function DriverScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chauffeurId = Number(id) || 1;
  const [tournee, setTournee] = useState<TourneeDetails | null>(null);
  const [stops, setStops] = useState<Arret[]>([]);
  const [collectedKg, setCollectedKg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function fetchTournee() {
      try {
        const data = await getTournee(chauffeurId, DATE_DEMO);
        if (data && data.arrets) {
          setTournee(data);
          // On garde tous les arrêts dans l'objet tournée, mais on filtre ceux à afficher
          setStops(data.arrets.filter(a => a.statut !== 'terminee' && a.statut !== 'erreur'));
          
          // INITIALISATION DU COMPTEUR : Somme des poids déjà collectés
          const alreadyCollected = data.arrets
            .filter(a => a.statut === 'terminee')
            .reduce((acc, a) => acc + (a.poids_prevu_kg || 0), 0);
          setCollectedKg(alreadyCollected);
        }
      } catch (e) {
        console.error("Erreur chargement tournée :", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTournee();
  }, []);

  const totalArrets = tournee ? tournee.arrets.length : 0;
  const doneArrets = tournee ? tournee.arrets.filter(a => a.statut === 'terminee' || a.statut === 'erreur').length : 0;
  const totalKgPrevu = tournee ? tournee.arrets.reduce((acc, a) => acc + (a.poids_prevu_kg || 0), 0) : 0;
  const kgProgressPct = totalKgPrevu === 0 ? 0 : Math.min(Math.round((collectedKg / totalKgPrevu) * 100), 100);
  const kgRestants = Math.max(totalKgPrevu - collectedKg, 0);

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  async function handleValidate(arret: Arret) {
    try {
      const bacsEstimes = Math.ceil((arret.poids_prevu_kg || 40) / 40); 
      await updateStatutTache(arret.tache_id, { statut: 'terminee', bacs_reels: bacsEstimes });
      
      setStops(prev => prev.filter(s => s.tache_id !== arret.tache_id));
      setCollectedKg(prev => prev + (arret.poids_prevu_kg || 0));
      // On met à jour l'objet local tournee pour que le calcul global reste juste si besoin
      if (tournee) {
        const updatedArrets = tournee.arrets.map(a => 
          a.tache_id === arret.tache_id ? { ...a, statut: 'terminee' as const } : a
        );
        setTournee({ ...tournee, arrets: updatedArrets });
      }
      showToast(`✓ ${arret.client_nom} validé`);
    } catch (e) {
      showToast("Erreur lors de la validation");
    }
  }

  async function handleSkip(arret: Arret) {
    try {
      await updateStatutTache(arret.tache_id, { 
        statut: 'erreur', 
        commentaire: "Signalé comme imprévu par le chauffeur" 
      });
      setStops(prev => prev.filter(s => s.tache_id !== arret.tache_id));
      if (tournee) {
        const updatedArrets = tournee.arrets.map(a => 
          a.tache_id === arret.tache_id ? { ...a, statut: 'erreur' as const } : a
        );
        setTournee({ ...tournee, arrets: updatedArrets });
      }
      showToast(`↷ ${arret.client_nom} reporté aux imprévus`);
    } catch (e) {
      showToast("Erreur lors du signalement");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
      </SafeAreaView>
    );
  }

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
            <Text style={s.avatarText}>{tournee?.chauffeur ? tournee.chauffeur[0] : 'C'}</Text>
          </LinearGradient>
          <View>
            <Text style={s.driverName}>{tournee?.chauffeur || 'Aucun chauffeur'}</Text>
            <Text style={s.driverSub}>
              {stops.length > 0
                ? `${stops.length} arrêt${stops.length > 1 ? 's' : ''} restant${stops.length > 1 ? 's' : ''} · ${kgRestants} kg`
                : tournee?.immatriculation || '–'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={() => router.replace('/')}>
          <Ionicons name="log-out-outline" size={20} color={colors.coral} />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={s.progressLabelRow}>
          <View>
            <Text style={s.progressKgBig}>{collectedKg} <Text style={s.progressKgUnit}>kg collectés</Text></Text>
            <Text style={s.progressSub}>sur {totalKgPrevu} kg prévus · {doneArrets}/{totalArrets} arrêts</Text>
          </View>
          <Text style={s.progressPct}>{kgProgressPct}%</Text>
        </View>
        <View style={s.progressBarBg}>
          <View style={[s.progressBarFill, { width: `${kgProgressPct}%` as any }]} />
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
            {doneArrets} collecte{doneArrets !== 1 ? 's' : ''} · {collectedKg} kg collectés
          </Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Hero — prochain arrêt */}
          {stops[0] && (
            <View style={s.heroCard}>
              <View style={s.heroTopRow}>
                <View style={s.heroLabel}>
                  <View style={s.heroDot} />
                  <Text style={s.heroLabelText}>Prochain arrêt</Text>
                </View>
                <View style={s.heroNumBadge}>
                  <Text style={s.heroNumText}>#{stops[0].ordre || 1}</Text>
                </View>
              </View>

              <Text style={s.heroClientName} numberOfLines={2}>{stops[0].client_nom}</Text>
              <Text style={s.heroPoids}>~{stops[0].poids_prevu_kg} kg à collecter</Text>

              <View style={s.heroActions}>
                <TouchableOpacity
                  style={s.heroValidate}
                  onPress={() => handleValidate(stops[0])}
                  activeOpacity={0.82}
                >
                  <LinearGradient
                    colors={[colors.primaryLight, colors.accent]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.heroActionGradient}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={s.heroValidateText}>Valider la collecte</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.heroSkip}
                  onPress={() => handleSkip(stops[0])}
                  activeOpacity={0.82}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={colors.coral} />
                  <Text style={s.heroSkipText}>Signaler un imprévu</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Liste des arrêts suivants */}
          {stops.length > 1 && (
            <>
              <View style={s.listHeader}>
                <Text style={s.listTitle}>Arrêts suivants</Text>
                <View style={s.listCount}>
                  <Text style={s.listCountText}>{stops.length - 1}</Text>
                </View>
              </View>

              {stops.slice(1).map((stop, i) => {
                const mappedStop = {
                  id: stop.tache_id,
                  ordre: stop.ordre || i + 2,
                  nom: stop.client_nom,
                  ville: 'Var',
                  poidsPrevu: stop.poids_prevu_kg,
                };
                return (
                  <StopCard
                    key={stop.tache_id}
                    stop={mappedStop}
                    isFirst={false}
                    onValidate={() => handleValidate(stop)}
                    onSkip={() => handleSkip(stop)}
                  />
                );
              })}
            </>
          )}
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
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EC',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  progressKgBig: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  progressKgUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  progressPct: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EAF2EE',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 99,
  },

  // Hero stop
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E8D4',
    padding: 22,
    marginBottom: 24,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  heroLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroNumBadge: {
    backgroundColor: '#E8F5EE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#C8E8D4',
  },
  heroNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  heroClientName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 6,
    lineHeight: 28,
  },
  heroPoids: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 22,
  },
  heroActions: {
    gap: 10,
  },
  heroValidate: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  heroActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },
  heroValidateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  heroSkip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(231,111,81,0.3)',
    backgroundColor: colors.coralLight,
  },
  heroSkipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.coral,
  },

  // List
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  listCount: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
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
