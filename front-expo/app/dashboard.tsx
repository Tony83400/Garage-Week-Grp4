import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import StatCard from '../components/StatCard';
import ActivityItem from '../components/ActivityItem';
import MobileDrawer from '../components/MobileDrawer';
import { getDashboardStats, getActiviteRecente, type DashboardStats, type Activite } from '../services/dashboard';

// Date des données de test — à remplacer par date.today() quand la BDD sera remplie au jour J
const DATE_DEMO = new Date().toISOString().split('T')[0];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildStats(s: DashboardStats) {
  const enCours = s.collectes_total - s.collectes_validees;
  return [
    {
      iconBg: '#E8F5EE',
      icon: <Ionicons name="leaf-outline" size={20} color={colors.primaryLight} />,
      value: `${s.poids_collecte_kg.toLocaleString('fr-FR')} kg`,
      numericValue: s.poids_collecte_kg,
      valueSuffix: ' kg',
      label: 'Biodéchets collectés',
      badgeText: `sur ${s.poids_prevu_kg.toLocaleString('fr-FR')} kg prévus`,
      badgeStyle: 'ok' as const,
      animDelay: 0,
    },
    {
      iconBg: '#E6F4FA',
      icon: <Ionicons name="checkmark-circle-outline" size={20} color={colors.secondary} />,
      value: `${s.collectes_validees} / ${s.collectes_total}`,
      numericValue: s.collectes_validees,
      valueSuffix: ` / ${s.collectes_total}`,
      label: 'Collectes validées',
      badgeText: `${enCours} en cours`,
      badgeStyle: 'info' as const,
      animDelay: 80,
    },
    {
      iconBg: colors.coralLight,
      icon: <Ionicons name="warning-outline" size={20} color={colors.coral} />,
      value: String(s.alertes),
      numericValue: s.alertes,
      valueSuffix: '',
      label: 'Alertes actives',
      badgeText: s.alertes > 0 ? '⚠ Action requise' : '✓ Aucune alerte',
      badgeStyle: s.alertes > 0 ? ('warn' as const) : ('ok' as const),
      animDelay: 160,
    },
    {
      iconBg: '#E6F7F9',
      icon: <Ionicons name="navigate-outline" size={20} color={colors.secondaryLight} />,
      value: `${s.km_total} km`,
      numericValue: s.km_total,
      valueSuffix: ' km',
      label: 'Distance totale',
      badgeText: 'Optimisé par IA',
      badgeStyle: 'info' as const,
      animDelay: 240,
    },
  ];
}

function buildActivities(list: Activite[]) {
  return list.map((a) => ({
    type: a.statut === 'terminee' ? ('success' as const) : ('error' as const),
    name: a.client,
    detail: a.statut === 'terminee' ? '✓ Collecte terminée' : '✗ Collecte en erreur',
    time: '',
  }));
}

// ── Briefing card ─────────────────────────────────────────────────────────────

function BriefingCard({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null;
  const isGenerated = stats.collectes_total > 0;
  const isDone = isGenerated && stats.collectes_validees === stats.collectes_total;

  if (!isGenerated) {
    return (
      <View style={[bs.card, { backgroundColor: '#F5F7F6', borderColor: '#D4E0DC' }]}>
        <View style={[bs.iconBox, { backgroundColor: '#E8EDEB' }]}>
          <Ionicons name="time-outline" size={20} color={colors.textMuted} />
        </View>
        <View style={bs.text}>
          <Text style={[bs.title, { color: colors.textMuted }]}>Tournées non générées</Text>
          <Text style={bs.sub}>Allez dans Planning pour lancer l'IA</Text>
        </View>
      </View>
    );
  }

  if (isDone) {
    return (
      <View style={[bs.card, { backgroundColor: colors.status.terminee.bg, borderColor: colors.status.terminee.border }]}>
        <View style={[bs.iconBox, { backgroundColor: '#C8E8D4' }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.status.terminee.fg} />
        </View>
        <View style={bs.text}>
          <Text style={[bs.title, { color: colors.status.terminee.fg }]}>Journée terminée</Text>
          <Text style={bs.sub}>
            {stats.poids_collecte_kg.toLocaleString('fr-FR')} kg collectés · {stats.km_total} km parcourus
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[bs.card, { backgroundColor: colors.status.en_cours.bg, borderColor: colors.status.en_cours.border }]}>
      <View style={[bs.iconBox, { backgroundColor: '#F5D9A0' }]}>
        <Ionicons name="car-outline" size={20} color={colors.status.en_cours.fg} />
      </View>
      <View style={bs.text}>
        <Text style={[bs.title, { color: colors.status.en_cours.fg }]}>
          {stats.collectes_validees} / {stats.collectes_total} collectes terminées
        </Text>
        <Text style={bs.sub}>
          {stats.alertes > 0 ? `${stats.alertes} alerte${stats.alertes > 1 ? 's' : ''} · ` : ''}
          {stats.km_total} km planifiés
        </Text>
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [s, a] = await Promise.all([
          getDashboardStats(DATE_DEMO),
          getActiviteRecente(DATE_DEMO),
        ]);
        setStats(s);
        setActivites(a);
      } catch (e) {
        console.warn('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={colors.primaryLight} />
        </TouchableOpacity>
        <Text style={styles.greeting}>
          Bonjour, <Text style={styles.greetingName}>Nicolas</Text> 👋
        </Text>
        <View style={styles.topbarRight}>
          <TouchableOpacity style={styles.notifBtn}>
            {stats && stats.alertes > 0 && <View style={styles.notifDot} />}
            <Ionicons name="notifications-outline" size={20} color={colors.primaryLight} />
          </TouchableOpacity>
          <LinearGradient
            colors={[colors.primaryLight, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>N</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Tableau de Bord</Text>
          <Text style={styles.pageSubtitle}>Vue d'ensemble en temps réel — Var (83)</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginTop: 40 }} />
        ) : (
          <>
            <BriefingCard stats={stats} />

            {/* Stats — 2 × 2 grid */}
            {stats && (() => {
              const STATS = buildStats(stats);
              return (
                <View style={styles.statsGrid}>
                  <View style={styles.statsRow}>
                    <StatCard {...STATS[0]} />
                    <StatCard {...STATS[1]} />
                  </View>
                  <View style={styles.statsRow}>
                    <StatCard {...STATS[2]} />
                    <StatCard {...STATS[3]} />
                  </View>
                </View>
              );
            })()}

            {/* Flotte en temps réel */}
            {stats && stats.flotte.length > 0 && (() => {
              const allDone = stats.flotte.every(f => f.termine);
              return (
                <View style={[styles.activityCard, { marginBottom: 24 }]}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle}>Positions de la flotte</Text>
                    <View style={[
                      styles.activityCount,
                      allDone && { backgroundColor: colors.status.terminee.bg },
                    ]}>
                      <Text style={[
                        styles.activityCountText,
                        allDone && { color: colors.status.terminee.fg },
                      ]}>
                        {allDone ? 'Terminé' : 'En cours'}
                      </Text>
                    </View>
                  </View>
                  {stats.flotte.map((f, i) => (
                    <View key={i} style={styles.fleetRow}>
                      <View style={[
                        styles.fleetDot,
                        { backgroundColor: f.termine ? colors.status.terminee.fg : colors.accent },
                      ]} />
                      <Text style={styles.fleetName}>{f.chauffeur} :</Text>
                      <Text style={[
                        styles.fleetPoint,
                        f.termine && { color: colors.status.terminee.fg },
                      ]}>
                        {f.dernier_point}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* Activity */}
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>Activité récente</Text>
                <View style={styles.activityCount}>
                  <Text style={styles.activityCountText}>
                    {activites.length} événement{activites.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {activites.length === 0 ? (
                <Text style={styles.emptyText}>Aucune activité pour cette journée.</Text>
              ) : (
                buildActivities(activites).map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={styles.divider} />}
                    <ActivityItem {...item} />
                  </React.Fragment>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="dashboard"
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  menuBtn: {
    marginRight: 12,
    padding: 4,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  greetingName: {
    color: colors.primaryLight,
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: colors.coral,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.card,
    zIndex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  statsGrid: {
    gap: 14,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EAF2EE',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  activityCount: {
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  activityCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginHorizontal: 14,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  fleetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  fleetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 10,
  },
  fleetName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginRight: 6,
  },
  fleetPoint: {
    fontSize: 14,
    color: colors.primaryLight,
    fontWeight: '600',
  },
});
