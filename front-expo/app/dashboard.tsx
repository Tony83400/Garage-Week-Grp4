import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import StatCard from '../components/StatCard';
import ActivityItem from '../components/ActivityItem';
import Sidebar from '../components/Sidebar';

// ── Icons ─────────────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z"
        stroke={colors.primaryLight}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 16a1.5 1.5 0 003 0"
        stroke={colors.primaryLight}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LocationIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 3C13.5 3 16 5.5 16 8.5C16 12 12.5 14.5 10 17C7.5 14.5 4 12 4 8.5C4 5.5 6.5 3 10 3Z"
        stroke={colors.primaryLight}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={7} stroke={colors.secondary} strokeWidth={1.5} />
      <Path
        d="M7 10l2 2 4-4"
        stroke={colors.secondary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WarningIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path d="M10 3v7" stroke={colors.coral} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={10} cy={14.5} r={1} fill={colors.coral} />
      <Path
        d="M10 1L18.5 16H1.5L10 1Z"
        stroke={colors.coral}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={7} stroke={colors.secondaryLight} strokeWidth={1.5} />
      <Path
        d="M10 6v4l3 2"
        stroke={colors.secondaryLight}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  {
    iconBg: '#E8F5EE',
    icon: <LocationIcon />,
    value: '2 000 kg',
    label: 'Biodéchets prévus',
    badgeText: '↑ Journée chargée',
    badgeStyle: 'ok' as const,
  },
  {
    iconBg: '#E6F4FA',
    icon: <CheckCircleIcon />,
    value: '11 / 15',
    label: 'Collectes validées',
    badgeText: '4 en cours',
    badgeStyle: 'info' as const,
  },
  {
    iconBg: colors.coralLight,
    icon: <WarningIcon />,
    value: '2',
    label: 'Alertes actives',
    badgeText: '⚠ Action requise',
    badgeStyle: 'warn' as const,
  },
  {
    iconBg: '#E6F7F9',
    icon: <ClockIcon />,
    value: '~20 min',
    label: 'Prochain camion',
    badgeText: 'Arrivée estimée',
    badgeStyle: 'info' as const,
  },
];

const ACTIVITIES = [
  { type: 'success' as const, name: 'Marc Dubois a validé la collecte', detail: '📍 Restaurant Le Provençal — Toulon (83000)', time: '08h14' },
  { type: 'success' as const, name: 'Sophie Martinez a validé la collecte', detail: '📍 Hôtel Ibis — La Seyne-sur-Mer (83500)', time: '08h47' },
  { type: 'error' as const, name: "Toni Jonio n'a pas pu finir sa tournée", detail: '📍 Arrêt : Cantine Municipale — Hyères (83400)', time: '09h03' },
  { type: 'success' as const, name: 'Zidane a validé la collecte', detail: '📍 Brasserie du Port — Sanary-sur-Mer (83110)', time: '09h31' },
  { type: 'success' as const, name: 'Jami a validé la collecte', detail: '📍 Lycée Bonaparte — Toulon (83000)', time: '09h58' },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const showSidebar = width >= 768;
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.layout}>
        {showSidebar && <Sidebar activeRoute="dashboard" />}

        <View style={styles.main}>
          {/* Topbar */}
          <View style={styles.topbar}>
            {!showSidebar && (
              <TouchableOpacity onPress={() => router.replace('/')} style={styles.logoutBtn}>
                <Text style={styles.logoutBtnText}>← Quitter</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.greeting, !showSidebar && styles.greetingMobile]}>
              Bonjour, <Text style={styles.greetingName}>Nicolas</Text> 👋
            </Text>
            <View style={styles.topbarRight}>
              <TouchableOpacity style={styles.notifBtn}>
                <View style={styles.notifDot} />
                <BellIcon />
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

            {/* Stats — 2 × 2 grid */}
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

            {/* Activity */}
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>Activité récente</Text>
                <View style={styles.activityCount}>
                  <Text style={styles.activityCountText}>5 événements</Text>
                </View>
              </View>

              {ACTIVITIES.map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={styles.divider} />}
                  <ActivityItem {...item} />
                </React.Fragment>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
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
  logoutBtn: {
    marginRight: 12,
  },
  logoutBtnText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  greetingMobile: {
    fontSize: 15,
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
});
