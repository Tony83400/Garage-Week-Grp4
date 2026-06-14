import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../constants/colors';
import { getTournee, updateStatutTache, type TourneeDetails, type Arret } from '../services/chauffeur';
import BlueBoBModal from '../components/BlueBoBModal';

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
  const [confirmAction, setConfirmAction] = useState<{ type: 'validate' | 'skip'; arret: Arret } | null>(null);
  const [showBlueBoB, setShowBlueBoB] = useState(false);
  const [logoutTap, setLogoutTap] = useState(false);
  const [finishedAt, setFinishedAt] = useState<string | null>(null);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchTournee() {
      try {
        const data = await getTournee(chauffeurId, DATE_DEMO);
        if (data && data.arrets) {
          setTournee(data);
          setStops(data.arrets.filter(a => a.statut !== 'terminee' && a.statut !== 'erreur'));
          const alreadyCollected = data.arrets
            .filter(a => a.statut === 'terminee')
            .reduce((acc, a) => acc + (a.poids_prevu_kg || 0), 0);
          setCollectedKg(alreadyCollected);
        }
      } catch (e) {
        console.error('Erreur chargement tournée :', e);
      } finally {
        setLoading(false);
      }
    }
    fetchTournee();
  }, []);

  const totalArrets    = tournee ? tournee.arrets.length : 0;
  const doneArrets     = tournee ? tournee.arrets.filter(a => a.statut === 'terminee' || a.statut === 'erreur').length : 0;
  const errorArrets    = tournee ? tournee.arrets.filter(a => a.statut === 'erreur').length : 0;
  const totalKgPrevu   = tournee ? tournee.arrets.reduce((acc, a) => acc + (a.poids_prevu_kg || 0), 0) : 0;
  const kgProgressPct  = totalKgPrevu === 0 ? 0 : Math.min(collectedKg / totalKgPrevu, 1);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: kgProgressPct,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [kgProgressPct]);

  useEffect(() => {
    if (!loading && stops.length === 0 && totalArrets > 0 && !finishedAt) {
      const now = new Date();
      setFinishedAt(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [stops.length, loading]);

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  function handleLogoutPress() {
    if (logoutTap) {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      router.replace('/');
    } else {
      setLogoutTap(true);
      logoutTimer.current = setTimeout(() => setLogoutTap(false), 2000);
    }
  }

  async function handleValidate(arret: Arret) {
    try {
      const bacsEstimes = Math.ceil((arret.poids_prevu_kg || 40) / 40);
      await updateStatutTache(arret.tache_id, { statut: 'terminee', bacs_reels: bacsEstimes });
      setStops(prev => prev.filter(s => s.tache_id !== arret.tache_id));
      setCollectedKg(prev => prev + (arret.poids_prevu_kg || 0));
      if (tournee) {
        setTournee({
          ...tournee,
          arrets: tournee.arrets.map(a =>
            a.tache_id === arret.tache_id ? { ...a, statut: 'terminee' as const } : a
          ),
        });
      }
      showToast(`Collecte validée · ${arret.client_nom}`);
    } catch {
      showToast('Erreur lors de la validation');
    }
  }

  async function handleSkip(arret: Arret) {
    try {
      await updateStatutTache(arret.tache_id, {
        statut: 'erreur',
        commentaire: 'Signalé comme imprévu par le chauffeur',
      });
      setStops(prev => prev.filter(s => s.tache_id !== arret.tache_id));
      if (tournee) {
        setTournee({
          ...tournee,
          arrets: tournee.arrets.map(a =>
            a.tache_id === arret.tache_id ? { ...a, statut: 'erreur' as const } : a
          ),
        });
      }
      showToast(`Signalé aux imprévus · ${arret.client_nom}`);
    } catch {
      showToast('Erreur lors du signalement');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
      </SafeAreaView>
    );
  }

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

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
            <Text style={s.avatarText}>
              {tournee?.chauffeur ? tournee.chauffeur[0].toUpperCase() : 'C'}
            </Text>
          </LinearGradient>
          <View>
            <Text style={s.driverName}>{tournee?.chauffeur || 'Chauffeur'}</Text>
            <Text style={s.driverSub}>{tournee?.immatriculation || '–'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.logoutBtn, logoutTap && s.logoutBtnActive]}
          onPress={handleLogoutPress}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={18} color={logoutTap ? colors.coral : colors.textMuted} />
          {logoutTap && <Text style={s.logoutConfirmText}>Confirmer</Text>}
        </TouchableOpacity>
      </View>

      {/* Progress strip */}
      <View style={s.progressWrap}>
        <View style={s.progressLabelRow}>
          <View>
            <Text style={s.progressKgBig}>
              {collectedKg.toLocaleString('fr-FR')}
              <Text style={s.progressKgUnit}> kg collectés</Text>
            </Text>
            <Text style={s.progressSub}>
              sur {totalKgPrevu.toLocaleString('fr-FR')} kg · {doneArrets}/{totalArrets} arrêts
            </Text>
          </View>
          <Text style={s.progressPct}>{Math.round(kgProgressPct * 100)}%</Text>
        </View>
        <View style={s.progressBarBg}>
          <Animated.View style={[s.progressBarFill, { width: progressWidth }]} />
        </View>
      </View>

      {/* Content */}
      {stops.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <Ionicons name="checkmark-circle" size={52} color={colors.status.terminee.fg} />
          </View>
          <Text style={s.emptyTitle}>Tournée terminée !</Text>

          {(tournee?.heure_depart || finishedAt) && (
            <Text style={s.emptyTime}>
              {tournee?.heure_depart ? tournee.heure_depart.slice(0, 5) : '–'}
              {' → '}
              {finishedAt ?? '–'}
            </Text>
          )}

          <View style={s.emptyStats}>
            <View style={s.emptyStat}>
              <Text style={s.emptyStatVal}>{totalArrets - errorArrets}</Text>
              <Text style={s.emptyStatLabel}>collectes</Text>
            </View>
            {errorArrets > 0 && (
              <View style={[s.emptyStat, s.emptyStatError]}>
                <Text style={[s.emptyStatVal, { color: colors.coral }]}>{errorArrets}</Text>
                <Text style={s.emptyStatLabel}>imprévu{errorArrets > 1 ? 's' : ''}</Text>
              </View>
            )}
            <View style={s.emptyStat}>
              <Text style={s.emptyStatVal}>{collectedKg.toLocaleString('fr-FR')}</Text>
              <Text style={s.emptyStatLabel}>kg</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.6}>
            <Text style={s.emptyLogout}>Se déconnecter</Text>
          </TouchableOpacity>
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
                  <Text style={s.heroNumText}>#{stops[0].ordre || 1} sur {totalArrets}</Text>
                </View>
              </View>

              <Text style={s.heroClientName} numberOfLines={2}>{stops[0].client_nom}</Text>
              <Text style={s.heroPoids}>{stops[0].poids_prevu_kg} kg à collecter</Text>

              <TouchableOpacity
                style={s.blueBoBBtn}
                onPress={() => setShowBlueBoB(true)}
                activeOpacity={0.8}
              >
                <View style={s.blueBoBLogoBox}>
                  <Text style={s.blueBoBLogoLetter}>B</Text>
                </View>
                <Text style={s.blueBoBBtnText}>Voir dans BlueBoB</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.heroValidate}
                onPress={() => setConfirmAction({ type: 'validate', arret: stops[0] })}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={[colors.primaryLight, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.heroActionGradient}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                  <Text style={s.heroValidateText}>Valider la collecte</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.heroSkip}
                onPress={() => setConfirmAction({ type: 'skip', arret: stops[0] })}
                activeOpacity={0.7}
              >
                <Text style={s.heroSkipText}>Signaler un imprévu</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Arrêts suivants — lecture seule, pas de boutons */}
          {stops.length > 1 && (
            <>
              <View style={s.listHeader}>
                <Text style={s.listTitle}>Arrêts suivants</Text>
                <View style={s.listCount}>
                  <Text style={s.listCountText}>{stops.length - 1}</Text>
                </View>
              </View>
              <View style={s.listCard}>
                {stops.slice(1).map((stop, i) => (
                  <React.Fragment key={stop.tache_id}>
                    {i > 0 && <View style={s.listDivider} />}
                    <View style={s.listItem}>
                      <View style={s.listNum}>
                        <Text style={s.listNumText}>{stop.ordre || i + 2}</Text>
                      </View>
                      <View style={s.listInfo}>
                        <Text style={s.listName} numberOfLines={1}>{stop.client_nom}</Text>
                        <Text style={s.listPoids}>{stop.poids_prevu_kg} kg</Text>
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Modal confirmation — valider ou signaler */}
      {confirmAction && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setConfirmAction(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={[
                s.modalIconBox,
                { backgroundColor: confirmAction.type === 'validate' ? colors.status.terminee.bg : colors.coralLight },
              ]}>
                <Ionicons
                  name={confirmAction.type === 'validate' ? 'checkmark-circle' : 'alert-circle'}
                  size={30}
                  color={confirmAction.type === 'validate' ? colors.status.terminee.fg : colors.coral}
                />
              </View>
              <Text style={s.modalTitle}>
                {confirmAction.type === 'validate' ? 'Confirmer la collecte' : 'Signaler un imprévu'}
              </Text>
              <Text style={s.modalClient}>{confirmAction.arret.client_nom}</Text>
              <Text style={s.modalDetail}>
                {confirmAction.type === 'validate'
                  ? `${confirmAction.arret.poids_prevu_kg} kg collectés`
                  : 'Reporté aux imprévus de demain'}
              </Text>
              <View style={s.modalActions}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setConfirmAction(null)} activeOpacity={0.7}>
                  <Text style={s.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.modalConfirm,
                    { backgroundColor: confirmAction.type === 'validate' ? colors.status.terminee.fg : colors.coral },
                  ]}
                  onPress={() => {
                    const action = confirmAction;
                    setConfirmAction(null);
                    if (action.type === 'validate') handleValidate(action.arret);
                    else handleSkip(action.arret);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={s.modalConfirmText}>
                    {confirmAction.type === 'validate' ? 'Confirmer' : 'Signaler'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* BlueBoB modal */}
      <BlueBoBModal
        visible={showBlueBoB}
        onClose={() => setShowBlueBoB(false)}
        stop={stops[0] ?? null}
        stopIndex={stops[0]?.ordre || 1}
        totalStops={totalArrets}
      />

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
  },
  logoutBtnActive: {
    backgroundColor: colors.coralLight,
    borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.3)',
  },
  logoutConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.coral,
  },

  // Progress strip
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

  // Hero card
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E8D4',
    padding: 22,
    marginBottom: 24,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
    lineHeight: 30,
  },
  heroPoids: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 14,
  },
  blueBoBBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A3FA8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  blueBoBLogoBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueBoBLogoLetter: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1A3FA8',
  },
  blueBoBBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  heroValidate: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  heroActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  heroValidateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  heroSkip: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroSkipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },

  // List — read-only
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
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    overflow: 'hidden',
  },
  listDivider: {
    height: 1,
    backgroundColor: colors.background,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  listNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8F0EC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  listInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  listPoids: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
    marginLeft: 8,
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
    backgroundColor: colors.status.terminee.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  emptyStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  emptyStat: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    minWidth: 72,
  },
  emptyStatError: {
    borderColor: 'rgba(231,111,81,0.25)',
    backgroundColor: colors.coralLight,
  },
  emptyStatVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  emptyStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyTime: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  emptyLogout: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textDecorationLine: 'underline',
    marginTop: 8,
  },

  // Confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  modalClient: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalDetail: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E8E4',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  modalConfirm: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 40,
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
