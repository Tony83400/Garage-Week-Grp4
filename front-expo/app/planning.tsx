import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import Sidebar from '../components/Sidebar';
import VehicleCard from '../components/VehicleCard';
import { getDashboardStats, type DashboardStats } from '../services/dashboard';
import { getClients, type Client } from '../services/clients';
import { getTournee, type Arret } from '../services/chauffeur';
import { getPlanningAdmin } from '../services/planning';

const DATE_DEMO = '2026-06-15';

// IDs chauffeurs connus des données de test — à remplacer par GET /api/chauffeurs
// Voir BACK_PLANNING.md
const CHAUFFEUR_IDS = [1, 2, 3, 4, 5];

type VehicleRow = { chauffeurId: number; arrets: Arret[] };

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function PlanningScreen() {
  const { width } = useWindowDimensions();
  const showSidebar = width >= 768;
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sitesOpen, setSitesOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // ── Data loading ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [statsRes, clientsRes, planningRes] = await Promise.allSettled([
          getDashboardStats(DATE_DEMO),
          getClients(),
          getPlanningAdmin(DATE_DEMO),
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (clientsRes.status === 'fulfilled') setClients(clientsRes.value);

        // Priorité : /api/admin/planning si implémenté
        if (planningRes.status === 'fulfilled' && planningRes.value.length > 0) {
          // TODO: mapper TourneeAdmin → VehicleRow quand le back l'implémentera
          setVehicles([]);
        } else {
          // Fallback : appel individuel par chauffeur (IDs hardcodés)
          const results = await Promise.allSettled(
            CHAUFFEUR_IDS.map(id => getTournee(id, DATE_DEMO))
          );
          const rows: VehicleRow[] = results
            .map((r, i) => ({
              chauffeurId: CHAUFFEUR_IDS[i],
              arrets: r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [],
            }))
            .filter(row => row.arrets.length > 0);
          setVehicles(rows);
        }
      } catch (e) {
        console.warn('Planning fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleGenerate() {
    // Non fonctionnel — OR-Tools non exposé via le back
    // Voir BACK_PLANNING.md : POST /api/tournees/generer
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      showToast('Génération IA disponible après intégration OR-Tools');
    }, 1800);
  }

  function handleImprevus() {
    // Page non implémentée — voir BACK_PLANNING.md : GET /api/imprevus
    showToast('Page imprévus bientôt disponible');
  }

  function handleExportBluebob(chauffeurId: number) {
    // Export côté client uniquement — voir BACK_PLANNING.md pour format
    showToast(`Export BlueBob — Chauffeur #${chauffeurId}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      <StatusBar style="dark" />

      <View style={s.layout}>
        {showSidebar && <Sidebar activeRoute="planning" />}

        <View style={s.main}>
          {/* Topbar */}
          <View style={s.topbar}>
            {!showSidebar && (
              <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <Text style={s.backBtnText}>← Retour</Text>
              </TouchableOpacity>
            )}
            <Text style={[s.greeting, !showSidebar && s.greetingMobile]}>
              Bonjour, <Text style={s.greetingName}>Nicolas</Text> 👋
            </Text>
            <View style={s.topbarRight}>
              <TouchableOpacity style={s.notifBtn}>
                {stats && stats.alertes > 0 && <View style={s.notifDot} />}
                <Ionicons name="notifications-outline" size={20} color={colors.primaryLight} />
              </TouchableOpacity>
              <LinearGradient
                colors={[colors.primaryLight, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.avatar}
              >
                <Text style={s.avatarText}>N</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={s.content} contentContainerStyle={s.contentContainer} showsVerticalScrollIndicator={false}>

            {/* Page header */}
            <View style={s.pageHeader}>
              <View>
                <Text style={s.pageTitle}>Planning & Tournées</Text>
                <Text style={s.pageSubtitle}>Optimisation IA par jour et par véhicule</Text>
              </View>
              <View style={s.dateBadge}>
                <Ionicons name="calendar-outline" size={14} color={colors.primaryLight} />
                <Text style={s.dateBadgeText}>{DATE_DEMO}</Text>
              </View>
            </View>

            {/* Alert banner — conditionnel sur stats.alertes */}
            {stats && stats.alertes > 0 && (
              <View style={s.alertBanner}>
                <Ionicons name="warning-outline" size={18} color={colors.coral} />
                <Text style={s.alertText}>
                  {stats.alertes} collecte{stats.alertes > 1 ? 's' : ''} en erreur aujourd'hui
                </Text>
              </View>
            )}

            {/* Action bar */}
            <View style={s.actionBar}>
              {/* Générer tournées — non fonctionnel (OR-Tools non exposé) */}
              <TouchableOpacity
                style={s.btnGenerate}
                onPress={handleGenerate}
                activeOpacity={0.85}
                disabled={generating}
              >
                <LinearGradient
                  colors={[colors.primaryLight, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btnGenerateGradient}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="sparkles-outline" size={16} color="#fff" />
                  )}
                  <Text style={s.btnGenerateText}>
                    {generating ? 'Calcul en cours...' : 'Générer les tournées (IA)'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Gérer les imprévus — page non implémentée */}
              <TouchableOpacity style={s.btnImprevus} onPress={handleImprevus} activeOpacity={0.8}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.coral} />
                <Text style={s.btnImprevusText}>Gérer les imprévus</Text>
              </TouchableOpacity>
            </View>

            {/* Map placeholder — nécessite react-native-maps + /api/admin/planning */}
            <View style={s.mapCard}>
              <LinearGradient
                colors={['#E8F5EE', '#F0F7F4']}
                style={s.mapGradient}
              >
                <View style={s.mapContent}>
                  <View style={s.mapIconWrap}>
                    <Ionicons name="map-outline" size={28} color={colors.primaryLight} />
                  </View>
                  <Text style={s.mapTitle}>Carte des tournées — Var (83)</Text>
                  <Text style={s.mapSubtitle}>
                    {clients.length > 0
                      ? `${clients.length} sites chargés depuis GET /clients`
                      : 'Chargement des sites...'}
                  </Text>
                  <View style={s.mapChip}>
                    <Ionicons name="information-circle-outline" size={13} color={colors.secondary} />
                    <Text style={s.mapChipText}>Nécessite react-native-maps · voir BACK_PLANNING.md</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Panel sites de collecte */}
            <View style={s.sitesPanel}>
              <TouchableOpacity
                style={s.sitesPanelHeader}
                onPress={() => setSitesOpen(v => !v)}
                activeOpacity={0.75}
              >
                <View style={s.sitesPanelLeft}>
                  <View style={s.sitesPanelIcon}>
                    <Ionicons name="location-outline" size={18} color={colors.primaryLight} />
                  </View>
                  <View>
                    <Text style={s.sitesPanelTitle}>Sites de collecte enregistrés</Text>
                    <Text style={s.sitesPanelSub}>
                      {clients.length} site{clients.length !== 1 ? 's' : ''} dans la base
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={sitesOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {sitesOpen && (
                <View style={s.sitesList}>
                  {clients.length === 0 ? (
                    <Text style={s.sitesEmpty}>Aucun site chargé</Text>
                  ) : (
                    clients.map((c, i) => (
                      <View key={c.id ?? i} style={[s.siteItem, i > 0 && s.siteDivider]}>
                        <View style={s.siteItemLeft}>
                          <Text style={s.siteName}>{c.nom_entreprise}</Text>
                          <Text style={s.siteCoords}>
                            {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                          </Text>
                        </View>
                        <Ionicons name="location" size={14} color={colors.accentLight} />
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Vehicle cards */}
            <View style={s.vehiclesSection}>
              <Text style={s.sectionTitle}>Tournées du jour</Text>
              <Text style={s.sectionSub}>
                {vehicles.length > 0
                  ? `${vehicles.length} véhicule${vehicles.length > 1 ? 's' : ''} en service`
                  : 'Aucune tournée assignée pour cette date'}
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginTop: 20 }} />
            ) : vehicles.length === 0 ? (
              <View style={s.emptyVehicles}>
                <Ionicons name="car-outline" size={32} color={colors.textMuted} />
                <Text style={s.emptyVehiclesText}>
                  Aucune tournée planifiée pour le {DATE_DEMO}
                </Text>
                <Text style={s.emptyVehiclesSub}>
                  Générez les tournées ou vérifiez les données de la base
                </Text>
              </View>
            ) : (
              vehicles.map((v, i) => (
                <VehicleCard
                  key={v.chauffeurId}
                  index={i}
                  chauffeurId={v.chauffeurId}
                  arrets={v.arrets}
                  onExport={() => handleExportBluebob(v.chauffeurId)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>

      {/* Toast */}
      {toast && (
        <Animated.View style={[s.toast, { opacity: toastOpacity }]}>
          <Text style={s.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  layout: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, backgroundColor: colors.background },

  // Topbar
  topbar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EC',
    height: 68,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: { marginRight: 12 },
  backBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  greeting: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  greetingMobile: { fontSize: 15 },
  greetingName: { color: colors.primaryLight },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8,
    backgroundColor: colors.coral, borderRadius: 4,
    borderWidth: 2, borderColor: colors.card, zIndex: 1,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 4,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Content
  content: { flex: 1 },
  contentContainer: { padding: 24, paddingBottom: 40 },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 3, fontWeight: '500' },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: '#D4E8DC',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  dateBadgeText: { fontSize: 13, fontWeight: '700', color: colors.primaryLight },

  // Alert banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.coralLight,
    borderWidth: 1, borderColor: 'rgba(231,111,81,0.25)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
    marginBottom: 18,
  },
  alertText: { fontSize: 13, fontWeight: '600', color: colors.coral, flex: 1 },

  // Action bar
  actionBar: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  btnGenerate: { borderRadius: 12, overflow: 'hidden', flex: 1, minWidth: 180 },
  btnGenerateGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 13,
  },
  btnGenerateText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnImprevus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(231,111,81,0.3)',
    backgroundColor: colors.coralLight,
  },
  btnImprevusText: { color: colors.coral, fontSize: 14, fontWeight: '600' },

  // Map placeholder
  mapCard: {
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EAF2EE',
    marginBottom: 18,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  mapGradient: { minHeight: 160 },
  mapContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, paddingHorizontal: 20,
  },
  mapIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  mapTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  mapSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 12 },
  mapChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#D4E8DC',
  },
  mapChipText: { fontSize: 11, color: colors.secondary, fontWeight: '600' },

  // Sites panel
  sitesPanel: {
    backgroundColor: colors.card,
    borderRadius: 18, borderWidth: 1, borderColor: '#EAF2EE',
    overflow: 'hidden', marginBottom: 24,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  sitesPanelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  sitesPanelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sitesPanelIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center',
  },
  sitesPanelTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  sitesPanelSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  sitesList: { borderTopWidth: 1, borderTopColor: '#EAF2EE' },
  sitesEmpty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', padding: 16 },
  siteItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  siteDivider: { borderTopWidth: 1, borderTopColor: '#F0F7F4' },
  siteItemLeft: { flex: 1 },
  siteName: { fontSize: 13, fontWeight: '600', color: colors.text },
  siteCoords: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  // Vehicles section
  vehiclesSection: { marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionSub: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },

  // Empty vehicles
  emptyVehicles: {
    backgroundColor: colors.card,
    borderRadius: 18, borderWidth: 1, borderColor: '#EAF2EE',
    alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  emptyVehiclesText: {
    fontSize: 14, fontWeight: '600', color: colors.text,
    marginTop: 12, textAlign: 'center',
  },
  emptyVehiclesSub: {
    fontSize: 13, color: colors.textMuted, marginTop: 6,
    textAlign: 'center', lineHeight: 18,
  },

  // Toast
  toast: {
    position: 'absolute', bottom: 28, right: 24, left: 24,
    backgroundColor: colors.primaryDark,
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
