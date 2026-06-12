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
  const progressPct = totalArrets === 0 ? 0 : Math.round((doneArrets / totalArrets) * 100);
  const totalKgPrevu = tournee ? tournee.arrets.reduce((acc, a) => acc + (a.poids_prevu_kg || 0), 0) : 0;

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
              {tournee?.immatriculation || 'Aucun véhicule'} · max {tournee?.capacite_max_kg || 0} kg
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
          <Text style={s.progressLabel}>{doneArrets} / {totalArrets} collectes</Text>
          <Text style={s.progressKg}>{collectedKg} / {totalKgPrevu} kg</Text>
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
            {doneArrets} collecte{doneArrets !== 1 ? 's' : ''} · {collectedKg} kg collectés
          </Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.listHeader}>
            <Text style={s.listTitle}>File de collecte</Text>
            <View style={s.listCount}>
              <Text style={s.listCountText}>
                {stops.length} arrêt{stops.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {stops.map((stop, i) => {
            // Transformation temporaire pour matcher le format attendu par ton composant StopCard actuel
            const mappedStop = {
              id: stop.tache_id,
              ordre: stop.ordre || i + 1,
              nom: stop.client_nom,
              ville: "Var", // A ajouter côté BDD plus tard si besoin
              poidsPrevu: stop.poids_prevu_kg
            };

            return (
              <StopCard
                key={stop.tache_id}
                stop={mappedStop}
                isFirst={i === 0}
                onValidate={() => handleValidate(stop)}
                onSkip={() => handleSkip(stop)}
              />
            );
          })}
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
