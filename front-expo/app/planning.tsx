import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import MobileDrawer from '../components/MobileDrawer';
import VehicleCard from '../components/VehicleCard';
import MapTournees, { type MapVehicle, type MapStop } from '../components/MapTournees';
import GenerationModal from '../components/GenerationModal';
import EditPlanningModal from '../components/EditPlanningModal';

import { getDashboardStats, type DashboardStats } from '../services/dashboard';
import { getClients, type Client } from '../services/clients';
import { getPlanningAdmin, genererBrouillons, optimiserTournees, getPlanningPreview, type TourneeAdmin } from '../services/planning';

type VehicleRow = { chauffeurId: number; chauffeurNom: string; heureDepart: string; heureFin: string; arrets: any[]; capaciteMaxKg: number; distance_km: number; immatriculation: string };

function todayISO() { return new Date().toISOString().split('T')[0]; }

function shiftDate(iso: string, delta: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function formatDateFR(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function PlanningScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [viewMode, setViewMode] = useState<'routes' | 'carte'>('routes');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [preview, setPreview] = useState<{ clients_dispo: number; chauffeurs_dispo: number } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStop, setSelectedStop] = useState<{ lat: number; lon: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  function navigateDate(delta: number) {
    setVehicles([]);
    setStats(null);
    setPreview(null);
    setViewMode('routes');
    setSelectedDate(prev => shiftDate(prev, delta));
  }

  // ── Chargement des données ───────────────────────────────────────────
  async function fetchData(date: string) {
    setLoading(true);
    try {
      const [statsRes, clientsRes, planningRes, previewRes] = await Promise.allSettled([
        getDashboardStats(date),
        getClients(),
        getPlanningAdmin(date),
        getPlanningPreview(date),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value);
      if (previewRes.status === 'fulfilled') setPreview(previewRes.value);

      if (planningRes.status === 'fulfilled' && planningRes.value) {
        console.log("=== LOG 2 : NOMBRE DE TOURNÉES REÇUES ===", planningRes.value.length);
        const rows: VehicleRow[] = planningRes.value.map(tournee => ({
          chauffeurId: tournee.chauffeur_id,
          chauffeurNom: tournee.chauffeur,
          heureDepart: tournee.heure_depart || '–',
          heureFin: tournee.heure_fin || '–',
          capaciteMaxKg: tournee.capacite_max_kg,
          immatriculation: tournee.immatriculation || '',
          distance_km: (tournee as any).distance_km || 0,
          arrets: tournee.arrets.map(a => ({
            tache_id: a.tache_id,
            client_nom: a.client_nom,
            adresse: "Adresse à compléter",
            statut: a.statut,
            bacs_prevus: Math.round(a.poids_prevu_kg / 40) || 0,
            poids_prevu_kg: a.poids_prevu_kg,
            latitude: (a as any).latitude || 0,
            longitude: (a as any).longitude || 0,
            ordre: a.ordre,
            heure_estimee: a.heure_estimee
          }))
        }));
        console.log("=== LOG 3 : ROWS PRÊTES POUR L'AFFICHAGE ===");
        console.log(JSON.stringify(rows.map(r => ({ id: r.chauffeurId, nom: r.chauffeurNom, arrets: r.arrets.length, km: r.distance_km })), null, 2));
        setVehicles(rows);
      }
    } catch (e) {
      console.warn('Planning fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  // ── Génération par l'IA (OR-Tools) ──────────────────────────────────
  async function handleGenerate() {
    setGenerating(true);
    showToast('Création des tâches de collecte...');
    try {
      await genererBrouillons(selectedDate);
      showToast('Optimisation des tournées en cours...');
      await optimiserTournees(selectedDate);
      setViewMode('routes');
      await fetchData(selectedDate);
      setShowGenModal(true);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || '';
      if (msg.includes('400') || msg.includes('tâche')) {
        showToast('Aucun client disponible ce jour-là');
      } else {
        showToast('Erreur lors de la génération IA');
      }
    } finally {
      setGenerating(false);
    }
  }

  function handleImprevus() {
    router.push('/imprevus');
  }

  function handleSaveEdit(updated: VehicleRow[]) {
    setVehicles(updated);
    setShowEditModal(false);
  }

  function handleExportBluebob(chauffeurNom: string) {
    showToast(`Export BlueBob — ${chauffeurNom}`);
  }

  const mapVehicles = useMemo<MapVehicle[]>(() =>
    vehicles.map((v, idx) => ({
      vehiculeIndex: idx,
      label: `VL${idx + 1}`,
      stops: v.arrets
        .filter(a => a.latitude && a.longitude)
        .map<MapStop>(a => ({
          lat: a.latitude,
          lon: a.longitude,
          label: a.client_nom,
          statut: a.statut,
          ordre: a.ordre,
        })),
    })),
    [vehicles]
  );

  const totalArrets = vehicles.reduce((acc, v) => acc + v.arrets.length, 0);
  const validees = stats?.collectes_validees ?? 0;
  const totalCollectes = stats?.collectes_total ?? 0;
  const isToday = selectedDate === todayISO();
  const inSupervision = !loading && vehicles.length > 0;
  const hasAlerts = (stats?.alertes ?? 0) > 0;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />

      {/* Topbar */}
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={s.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.topbarTitle}>Planning</Text>
          <Text style={s.topbarSub}>Var 83 · tournées</Text>
        </View>
        <TouchableOpacity
          style={[s.notifBtn, hasAlerts && s.notifBtnAlert]}
          onPress={() => { if (hasAlerts) router.push('/imprevus'); }}
          activeOpacity={0.75}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={hasAlerts ? '#CC1F1F' : colors.primaryLight}
          />
          {hasAlerts && (
            <View style={s.notifCount}>
              <Text style={s.notifCountText}>{stats!.alertes}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Navigateur de date — pleine largeur, toujours visible */}
      <View style={s.dateStrip}>
        <TouchableOpacity style={s.dateBtn} onPress={() => navigateDate(-1)} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={s.dateCenterBlock}>
          <Text style={s.dateText}>{formatDateFR(selectedDate)}</Text>
          {isToday && (
            <View style={s.todayBadge}>
              <Text style={s.todayBadgeText}>aujourd'hui</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.dateBtn} onPress={() => navigateDate(1)} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {/* Contenu scrollable */}
      <ScrollView
        style={s.content}
        contentContainerStyle={[s.contentContainer, inSupervision && { paddingBottom: 84 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── MODE PRÉPARATION ── */}
        {!loading && vehicles.length === 0 && (
          <View style={s.prepCard}>
            <View style={s.prepIconBox}>
              <Ionicons name="sparkles-outline" size={28} color={colors.primaryLight} />
            </View>
            <Text style={s.prepTitle}>Prêt à planifier</Text>

            {preview ? (
              <View style={s.prepMetrics}>
                <View style={s.prepMetricItem}>
                  <Text style={s.prepMetricValue}>{preview.clients_dispo}</Text>
                  <Text style={s.prepMetricLabel}>clients disponibles</Text>
                </View>
                <View style={s.prepMetricDivider} />
                <View style={s.prepMetricItem}>
                  <Text style={s.prepMetricValue}>{preview.chauffeurs_dispo}</Text>
                  <Text style={s.prepMetricLabel}>chauffeurs planifiés</Text>
                </View>
              </View>
            ) : (
              <Text style={s.prepSub}>
                {clients.length} sites enregistrés
              </Text>
            )}

            <TouchableOpacity
              style={s.btnGenerateHero}
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
                {generating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="sparkles-outline" size={18} color="#fff" />
                }
                <Text style={s.btnGenerateText}>
                  {generating ? 'Calcul IA en cours...' : 'Générer les tournées'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginTop: 40 }} />
        )}

        {/* ── MODE SUPERVISION ── */}
        {inSupervision && (
          <>
            {/* Stats rapides */}
            <View style={s.statsBar}>
              <View style={s.statItem}>
                <Text style={s.statValue}>{vehicles.length}</Text>
                <Text style={s.statLabel}>Camions</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{totalArrets}</Text>
                <Text style={s.statLabel}>Arrêts</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{validees}/{totalCollectes}</Text>
                <Text style={s.statLabel}>Validées</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{stats?.km_total || 0} km</Text>
                <Text style={s.statLabel}>Distance</Text>
              </View>
            </View>

            {/* Alerte erreurs — cliquable */}
            {stats && stats.alertes > 0 && (
              <TouchableOpacity onPress={handleImprevus} activeOpacity={0.85}>
                <View style={s.alertBanner}>
                  <Ionicons name="warning-outline" size={18} color={colors.coral} />
                  <Text style={s.alertText}>
                    {stats.alertes} imprévu{stats.alertes > 1 ? 's' : ''} à traiter
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.coral} />
                </View>
              </TouchableOpacity>
            )}

            {/* Toggle Tournées / Carte */}
            <View style={s.viewToggle}>
              <TouchableOpacity
                style={[s.viewToggleBtn, viewMode === 'routes' && s.viewToggleActive]}
                onPress={() => setViewMode('routes')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="list-outline"
                  size={15}
                  color={viewMode === 'routes' ? colors.primaryLight : colors.textMuted}
                />
                <Text style={[s.viewToggleText, viewMode === 'routes' && s.viewToggleTextActive]}>
                  Tournées
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.viewToggleBtn, viewMode === 'carte' && s.viewToggleActive]}
                onPress={() => setViewMode('carte')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="map-outline"
                  size={15}
                  color={viewMode === 'carte' ? colors.primaryLight : colors.textMuted}
                />
                <Text style={[s.viewToggleText, viewMode === 'carte' && s.viewToggleTextActive]}>
                  Carte
                </Text>
              </TouchableOpacity>
            </View>

            {/* Vue Tournées */}
            {viewMode === 'routes' && (
              <>
                <View style={s.vehiclesSection}>
                  <Text style={s.sectionTitle}>Tournées · {formatDateFR(selectedDate)}</Text>
                  <Text style={s.sectionSub}>
                    {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} en service
                  </Text>
                </View>
                {vehicles.map((v, i) => (
                  <VehicleCard
                    key={`vehicle-card-${v.chauffeurId}-${i}`}
                    index={i}
                    chauffeurId={v.chauffeurId}
                    chauffeurNom={v.chauffeurNom}
                    heureDepart={v.heureDepart}
                    heureFin={v.heureFin}
                    immatriculation={v.immatriculation}
                    arrets={v.arrets}
                    capaciteMaxKg={v.capaciteMaxKg}
                    animDelay={i * 80}
                    onExport={() => handleExportBluebob(v.chauffeurNom)}
                    onStopPress={(lat, lon) => setSelectedStop({ lat, lon })}
                  />
                ))}
              </>
            )}

            {/* Vue Carte */}
            {viewMode === 'carte' && (
              <View style={s.mapCard}>
                <View style={s.mapHeader}>
                  <Ionicons name="map-outline" size={16} color={colors.primaryLight} />
                  <Text style={s.mapTitle}>Carte des tournées</Text>
                  <View style={s.mapChip}>
                    <Text style={s.mapChipText}>
                      {mapVehicles.reduce((a, v) => a + v.stops.length, 0)} arrêts
                    </Text>
                  </View>
                </View>
                <MapTournees height={400} vehicles={mapVehicles} selectedStop={selectedStop} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Footer fixe — toujours visible en mode supervision */}
      {inSupervision && (
        <View style={s.fixedFooter}>
          <TouchableOpacity style={s.btnImprevus} onPress={handleImprevus} activeOpacity={0.8}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.coral} />
            <Text style={s.btnImprevusText}>Imprévus</Text>
            {stats && stats.alertes > 0 && (
              <View style={s.imprevusBadge}>
                <Text style={s.imprevusBadgeText}>{stats.alertes}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btnRegenerate}
            onPress={handleGenerate}
            activeOpacity={0.85}
            disabled={generating}
          >
            {generating
              ? <ActivityIndicator size="small" color={colors.textMuted} />
              : <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
            }
            <Text style={s.btnRegenerateText}>
              {generating ? 'Recalcul...' : 'Régénérer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {toast && (
        <Animated.View style={[s.toast, { opacity: toastOpacity }]}>
          <Text style={s.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="planning" />

      <GenerationModal
        visible={showGenModal}
        vehicles={vehicles}
        date={selectedDate}
        kmTotal={stats?.km_total ?? 0}
        onValider={() => setShowGenModal(false)}
        onModifier={() => { setShowGenModal(false); setShowEditModal(true); }}
      />
      <EditPlanningModal
        visible={showEditModal}
        vehicles={vehicles}
        onSave={handleSaveEdit}
        onClose={() => setShowEditModal(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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
  menuBtn: { marginRight: 12, padding: 4 },
  topbarTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  topbarSub: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 1 },
  notifBtn: {
    width: 44, height: 36, borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBtnAlert: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1, borderColor: '#F87171',
    paddingHorizontal: 10,
    width: 'auto' as any,
    flexDirection: 'row' as const,
    gap: 5,
  },
  notifCount: {
    backgroundColor: '#CC1F1F',
    borderRadius: 8, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Navigateur de date
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EC',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dateBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  dateCenterBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dateText: { fontSize: 16, fontWeight: '700', color: colors.text },
  todayBadge: {
    backgroundColor: '#E8F5EE',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primaryLight },

  // Contenu
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },

  // Mode préparation
  prepCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  prepIconBox: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  prepTitle: {
    fontSize: 18, fontWeight: '800', color: colors.text,
    marginBottom: 6, letterSpacing: -0.3,
  },
  prepSub: {
    fontSize: 13, color: colors.textMuted, fontWeight: '500',
    marginBottom: 24, textAlign: 'center',
  },
  prepMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7F4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E8D4',
    marginBottom: 24,
    overflow: 'hidden',
    width: '100%',
  },
  prepMetricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  prepMetricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#C8E8D4',
  },
  prepMetricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: -0.5,
  },
  prepMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 3,
  },
  btnGenerateHero: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  btnGenerateGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingHorizontal: 20, paddingVertical: 14,
  },
  btnGenerateText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1, borderColor: '#EAF2EE',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: '#EAF2EE' },
  statValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  statLabel: {
    fontSize: 10, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4,
  },

  // Alerte
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.coralLight,
    borderWidth: 1, borderColor: 'rgba(231,111,81,0.25)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
    marginBottom: 14,
  },
  alertText: { fontSize: 13, fontWeight: '600', color: colors.coral, flex: 1 },

  // Toggle Tournées / Carte
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 13,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDE8E3',
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  viewToggleActive: {
    backgroundColor: colors.card,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  viewToggleText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  viewToggleTextActive: { color: colors.primaryLight },

  // Section tournées
  vehiclesSection: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionSub: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },

  // Carte
  mapCard: {
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EAF2EE',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    backgroundColor: colors.card,
  },
  mapHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EAF2EE',
  },
  mapTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  mapChip: {
    backgroundColor: '#E8F5EE', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  mapChipText: { fontSize: 11, color: colors.primaryLight, fontWeight: '600' },

  // Footer fixe
  fixedFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: '#E8F0EC',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  btnImprevus: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(231,111,81,0.3)',
    backgroundColor: colors.coralLight,
    position: 'relative',
  },
  btnImprevusText: { color: colors.coral, fontSize: 14, fontWeight: '600' },
  imprevusBadge: {
    backgroundColor: colors.coral,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imprevusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  btnRegenerate: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#D4E8DC',
    backgroundColor: '#F0F7F4',
  },
  btnRegenerateText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },

  // Toast
  toast: {
    position: 'absolute', top: 80, right: 24, left: 24,
    backgroundColor: colors.primaryDark,
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
