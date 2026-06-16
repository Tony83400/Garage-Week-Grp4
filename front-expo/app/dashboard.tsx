import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ImageBackground,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import MobileDrawer from '../components/MobileDrawer';
import { getDashboardStats, getActiviteRecente, type DashboardStats, type Activite } from '../services/dashboard';
import { useRouter } from 'expo-router';

const DATE_DEMO = new Date().toISOString().split('T')[0];

const CREAM        = '#F5EEDF';
const TEXT_DARK    = '#0C3A34';
const TEXT_MUTED   = '#5F6D68';
const PANEL_BORDER = '#D9CBB4';
const LINE         = '#DFD3BD';
const GREEN_CTA    = '#063F35';
const SERIF        = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── Hero section ─────────────────────────────────────────────────────────────

function HeroSection({
  stats,
  loading,
  hasAlerts,
  onGoPlanning,
  onGoImprevus,
}: {
  stats: DashboardStats | null;
  loading: boolean;
  hasAlerts: boolean;
  onGoPlanning: () => void;
  onGoImprevus: () => void;
}) {
  const isGenerated = !!stats && stats.collectes_total > 0;
  const isDone = isGenerated && stats!.collectes_validees === stats!.collectes_total;

  const pillLabel = !isGenerated
    ? 'ÉTAT DU JOUR'
    : isDone
    ? 'JOURNÉE TERMINÉE'
    : 'EN COURS';

  const title = !isGenerated
    ? 'Aucune tournée générée \npour cette date\n'
    : isDone
    ? `Journée terminée ✓`
    : `Tournées en cours`;

  const desc = !isGenerated
    ? '\nLa journée n\'est pas encore préparée. \nOuvrez Planning pour vérifier les données\net lancer la génération.\n'
    : isDone
    ? `${stats!.collectes_total} collectes · ${stats!.poids_collecte_kg.toLocaleString('fr-FR')} kg collectés · ${stats!.km_total} km parcourus`
    : `${stats!.collectes_validees}/${stats!.collectes_total} collectes validées · ${stats!.poids_collecte_kg.toLocaleString('fr-FR')} kg collectés`;

  return (
    <ImageBackground
      source={require('../assets/ref/truck.png')}
      style={hero.container}
      resizeMode="cover"
      imageStyle={{ transform: [{ translateX: 130 }, { translateY: -310 }, { scale: 0.6 }] }}
    >
      <LinearGradient
        colors={[
          'rgba(250,244,229,0.98)',
          'rgba(250,244,229,0.96)',
          'rgba(250,244,229,0.82)',
          'rgba(250,244,229,0.45)',
          'rgba(250,244,229,0.12)',
          'rgba(250,244,229,0.12)',
        ]}
        locations={[0, 0.26, 0.43, 0.58, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {loading ? (
        <ActivityIndicator size="small" color={GREEN_CTA} style={{ margin: 40 }} />
      ) : (
        <View style={hero.copy}>
          <View style={hero.pill}>
            <Text style={hero.pillText}>{pillLabel}</Text>
          </View>

          <Text style={hero.title}>{title}</Text>
          <Text style={hero.desc}>{desc}</Text>

          {!isGenerated && (
            <View style={hero.actions}>
              <TouchableOpacity style={hero.cta} onPress={onGoPlanning} activeOpacity={0.8}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={hero.ctaText}>Ouvrir Planning</Text>
                <Text style={hero.ctaArrow}>→</Text>
              </TouchableOpacity>

              {hasAlerts && (
                <TouchableOpacity style={hero.alertLink} onPress={onGoImprevus} activeOpacity={0.75}>
                  <Ionicons name="warning-outline" size={17} color="#CC3A25" />
                  <Text style={hero.alertLinkText}>
                    {stats?.alertes ?? 0} imprévus à consulter ›
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isGenerated && !isDone && hasAlerts && (
            <View style={hero.actions}>
              <TouchableOpacity style={hero.alertLinkFull} onPress={onGoImprevus} activeOpacity={0.75}>
                <Ionicons name="alert-circle-outline" size={17} color="#CC3A25" />
                <Text style={hero.alertLinkText}>
                  {stats!.alertes} imprév{stats!.alertes > 1 ? 'us' : 'u'} à traiter ›
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ImageBackground>
  );
}

const hero = StyleSheet.create({
  container: {
    minHeight: 460,
    overflow: 'hidden',
    backgroundColor: CREAM,
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
  },
  copy: {
    width: '56%',
    paddingLeft: 28,
    paddingRight: 12,
    paddingTop: 44,
    paddingBottom: 44,
  },
  pill: {
    alignSelf: 'flex-start',
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#D9E1C6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pillText: {
    color: '#244E38',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: SERIF,
    fontSize: 45,
    lineHeight: 38,
    color: TEXT_DARK,
    marginBottom: 12,
  },
  desc: {
    fontSize: 21,
    lineHeight: 22,
    color: TEXT_MUTED,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-start',
  },
  cta: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: GREEN_CTA,
  },
  ctaText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  ctaArrow: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
    marginLeft: 2,
  },
  alertLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 2,
  },
  alertLinkFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  alertLinkText: {
    color: '#CC3A25',
    fontSize: 15,
    fontWeight: '800',
  },
});

// ── JourneeCard (données de progression) ─────────────────────────────────────

function JourneeCard({ stats, onGoImprevus }: {
  stats: DashboardStats;
  onGoImprevus: () => void;
}) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isDone = stats.collectes_validees === stats.collectes_total;
  const pct = stats.poids_prevu_kg > 0
    ? Math.min(stats.poids_collecte_kg / stats.poids_prevu_kg, 1)
    : 0;
  const hasAlert = stats.alertes > 0 && !isDone;

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 900,
      delay: 150,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const RED = { bg: '#FEE2E2', border: '#F87171', fg: '#CC1F1F', iconBg: '#FECACA' };
  const statusColor  = isDone ? colors.status.terminee.fg : hasAlert ? RED.fg : colors.status.en_cours.fg;
  const statusBg     = isDone ? colors.status.terminee.bg : hasAlert ? RED.bg : colors.status.en_cours.bg;
  const statusBorder = isDone ? colors.status.terminee.border : hasAlert ? RED.border : colors.status.en_cours.border;
  const statusIconBg = isDone ? '#C8E8D4' : hasAlert ? RED.iconBg : '#F5D9A0';
  const statusIcon   = isDone ? 'checkmark-circle' : hasAlert ? 'alert-circle' : 'car-outline';
  const statusText   = isDone
    ? `Journée terminée · ${stats.km_total} km parcourus`
    : hasAlert
    ? `Imprévus détectés · ${stats.km_total} km planifiés`
    : `Tournées en cours · ${stats.km_total} km planifiés`;
  const progressColor = isDone ? colors.status.terminee.fg : hasAlert ? RED.fg : colors.accent;

  const enCoursVrai = Math.max(0, stats.collectes_total - stats.collectes_validees - stats.alertes);
  const bottomSuffix = (() => {
    if (stats.alertes === 0 && enCoursVrai === 0) return ' · tout validé';
    const parts: string[] = [];
    if (enCoursVrai > 0) parts.push(`${enCoursVrai} en cours`);
    if (stats.alertes > 0) parts.push(`${stats.alertes} imprévu${stats.alertes > 1 ? 's' : ''}`);
    return ' · ' + parts.join(' · ');
  })();

  return (
    <View style={[jc.card, { backgroundColor: statusBg, borderColor: statusBorder }]}>
      <View style={jc.statusRow}>
        <View style={[jc.iconBox, { backgroundColor: statusIconBg }]}>
          <Ionicons name={statusIcon as any} size={18} color={statusColor} />
        </View>
        <Text style={[jc.statusLabel, { color: statusColor }]} numberOfLines={1}>{statusText}</Text>
      </View>

      <View style={[jc.sep, hasAlert && { backgroundColor: 'rgba(204,31,31,0.12)' }]} />

      <View style={jc.metricRow}>
        <Ionicons name="leaf-outline" size={14} color={colors.primaryLight} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={jc.metricTop}>
            <Text style={jc.metricValue}>
              {stats.poids_collecte_kg.toLocaleString('fr-FR')}
              <Text style={jc.metricUnit}> kg</Text>
            </Text>
            <Text style={jc.metricRight}>sur {stats.poids_prevu_kg.toLocaleString('fr-FR')} kg prévus</Text>
          </View>
          <View style={jc.progressTrack}>
            <Animated.View
              style={[jc.progressFill, {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: progressColor,
              }]}
            />
          </View>
        </View>
      </View>

      <View style={jc.bottomRow}>
        <Ionicons name="checkmark-circle-outline" size={14} color={colors.secondary} />
        <Text style={jc.bottomText}>
          <Text style={jc.bottomBold}>{stats.collectes_validees}/{stats.collectes_total}</Text>
          {' '}collectes validées{bottomSuffix}
        </Text>
      </View>

      {hasAlert && (
        <TouchableOpacity onPress={onGoImprevus} activeOpacity={0.75} style={jc.alertFooter}>
          <Ionicons name="alert-circle-outline" size={14} color={RED.fg} />
          <Text style={[jc.alertFooterText, { color: RED.fg }]}>
            {stats.alertes} impr{stats.alertes > 1 ? 'évus' : 'évu'} à traiter
          </Text>
          <Ionicons name="chevron-forward" size={13} color={RED.fg} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const jc = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#0C3A34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  statusLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: 14 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  metricTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  metricValue: { fontSize: 20, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3 },
  metricUnit: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  metricRight: { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },
  progressTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bottomText: { fontSize: 13, color: TEXT_MUTED, fontWeight: '500', flex: 1 },
  bottomBold: { fontWeight: '700', color: TEXT_DARK },
  alertFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(231,111,81,0.2)',
  },
  alertFooterText: { flex: 1, fontSize: 13, fontWeight: '700' },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const isGenerated = !!stats && stats.collectes_total > 0;
  const hasAlerts = (stats?.alertes ?? 0) > 0;

  function showOkToast() {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }

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
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color="#fff8e9" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>AlchiRoute</Text>
        <TouchableOpacity
          style={[styles.notifBtn, hasAlerts && styles.notifBtnAlert]}
          onPress={() => hasAlerts ? router.push('/imprevus') : showOkToast()}
          activeOpacity={0.75}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={hasAlerts ? '#CC1F1F' : '#fff8e9'}
          />
          {hasAlerts && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{stats!.alertes}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <HeroSection
          stats={stats}
          loading={loading}
          hasAlerts={hasAlerts}
          onGoPlanning={() => router.push('/planning')}
          onGoImprevus={() => router.push('/imprevus')}
        />

        <View style={styles.body}>
          {/* Données de progression — visible seulement si tournées générées */}
          {!loading && isGenerated && (
            <JourneeCard
              stats={stats!}
              onGoImprevus={() => router.push('/imprevus')}
            />
          )}

          {/* ── À faire maintenant + Accès rapides côte à côte ── */}
          <View style={styles.panelRow}>

            {/* À faire — informatif (planning non-cliquable, imprévus cliquable) */}
            <View style={[panel.box, styles.panelFlex]}>
              <View style={panel.header}>
                <Text style={panel.headerTitle}>À faire</Text>
                <View style={panel.headerLine} />
              </View>

              {/* Planning — non-cliquable, juste un rappel contextuel */}
              <View style={panel.task}>
                <View style={[panel.tile, { backgroundColor: '#DFE7CC' }]}>
                  <Ionicons name="calendar-outline" size={18} color={TEXT_DARK} />
                </View>
                <View style={panel.taskBody}>
                  <Text style={panel.taskTitle} numberOfLines={2}>
                    {isGenerated ? 'Superviser les tournées' : 'Préparer les tournées'}
                  </Text>
                  <Text style={panel.taskSub} numberOfLines={2}>
                    {isGenerated ? 'Suivez l\'avancement.' : 'Lancez la génération.'}
                  </Text>
                </View>
              </View>

              {/* Imprévus — cliquable, urgent */}
              {hasAlerts ? (
                <TouchableOpacity style={[panel.task, panel.taskLast]} onPress={() => router.push('/imprevus')} activeOpacity={0.75}>
                  <View style={[panel.tile, { backgroundColor: '#F0DFBE' }]}>
                    <Ionicons name="warning-outline" size={18} color="#C43B25" />
                  </View>
                  <View style={panel.taskBody}>
                    <Text style={[panel.taskTitle, { color: '#C43B25' }]} numberOfLines={2}>
                      {stats!.alertes} imprév{stats!.alertes > 1 ? 'us' : 'u'} actifs
                    </Text>
                    <Text style={panel.taskSub} numberOfLines={2}>Action requise.</Text>
                  </View>
                  <Text style={[panel.chevron, { color: '#C43B25' }]}>›</Text>
                </TouchableOpacity>
              ) : (
                <View style={[panel.task, panel.taskLast]}>
                  <View style={[panel.tile, { backgroundColor: '#E8F5EE' }]}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#2D6A4F" />
                  </View>
                  <View style={panel.taskBody}>
                    <Text style={[panel.taskTitle, { color: '#2D6A4F' }]} numberOfLines={2}>Aucun imprévu</Text>
                    <Text style={panel.taskSub} numberOfLines={2}>Tout roule.</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Accès rapides — 3 tuiles en grille */}
            <View style={[panel.box, styles.panelFlex]}>
              <View style={panel.header}>
                <Text style={panel.headerTitle}>Accès</Text>
                <View style={panel.headerLine} />
              </View>

              <View style={quick.triGrid}>
                <TouchableOpacity style={quick.triItem} onPress={() => router.push('/imprevus')} activeOpacity={0.75}>
                  <View style={[quick.triIcon, { backgroundColor: '#F0DFBE' }]}>
                    <Ionicons name="warning-outline" size={18} color="#C43B25" />
                  </View>
                  <Text style={quick.triLabel}>Imprévus</Text>
                </TouchableOpacity>

                <TouchableOpacity style={quick.triItem} onPress={() => router.push('/sites')} activeOpacity={0.75}>
                  <View style={[quick.triIcon, { backgroundColor: '#DFE7CC' }]}>
                    <Ionicons name="location-outline" size={18} color={TEXT_DARK} />
                  </View>
                  <Text style={quick.triLabel}>Sites</Text>
                </TouchableOpacity>

                <TouchableOpacity style={quick.triItem} onPress={() => router.push('/ressources')} activeOpacity={0.75}>
                  <View style={[quick.triIcon, { backgroundColor: '#DCE5CD' }]}>
                    <Ionicons name="document-text-outline" size={18} color={TEXT_DARK} />
                  </View>
                  <Text style={quick.triLabel}>Ressources</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>

          {/* ── Flotte en temps réel ── */}
          {!loading && stats && stats.flotte.length > 0 && (() => {
            const allDone  = stats.flotte.every(f => f.termine);
            const anyError = stats.flotte.some(f => f.erreurs > 0);
            const badgeBg  = !allDone ? colors.status.en_cours.bg : anyError ? colors.coralLight : colors.status.terminee.bg;
            const badgeFg  = !allDone ? colors.status.en_cours.fg : anyError ? colors.coral : colors.status.terminee.fg;
            const badgeLabel = !allDone ? 'En tournée' : anyError ? 'Terminé avec erreurs' : 'Terminé';
            return (
              <>
                <View style={styles.sectionLabel}>
                  <Text style={styles.sectionLabelText}>
                    FLOTTE · {stats.flotte.length} CHAUFFEUR{stats.flotte.length > 1 ? 'S' : ''}
                  </Text>
                  <View style={[styles.sectionBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.sectionBadgeText, { color: badgeFg }]}>{badgeLabel}</Text>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  {stats.flotte.map((f, i) => {
                    const initials = f.chauffeur
                      .split(' ')
                      .map((w: string) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    const avatarBg = !f.termine
                      ? colors.status.en_cours.fg
                      : f.erreurs > 0 ? colors.coral : colors.status.terminee.fg;
                    const fBadgeBg = !f.termine ? colors.status.en_cours.bg : f.erreurs > 0 ? colors.coralLight : colors.status.terminee.bg;
                    const fBadgeFg = !f.termine ? colors.status.en_cours.fg : f.erreurs > 0 ? colors.coral : colors.status.terminee.fg;
                    const fLabel   = !f.termine ? 'En tournée' : f.erreurs > 0 ? `${f.erreurs} erreur${f.erreurs > 1 ? 's' : ''}` : 'Terminé ✓';
                    return (
                      <React.Fragment key={i}>
                        {i > 0 && <View style={styles.divider} />}
                        <View style={styles.fleetRow}>
                          <View style={[styles.fleetAvatar, { backgroundColor: avatarBg }]}>
                            <Text style={styles.fleetAvatarText}>{initials}</Text>
                          </View>
                          <View style={styles.fleetInfo}>
                            <Text style={styles.fleetName}>{f.chauffeur}</Text>
                            <Text style={styles.fleetPoint}>
                              {f.termine ? f.dernier_point : `Dernier arrêt · ${f.dernier_point}`}
                            </Text>
                          </View>
                          <View style={[styles.fleetBadge, { backgroundColor: fBadgeBg }]}>
                            <Text style={[styles.fleetBadgeText, { color: fBadgeFg }]}>{fLabel}</Text>
                          </View>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
              </>
            );
          })()}

        </View>
      </ScrollView>

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="dashboard"
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={16} color={colors.status.terminee.fg} />
        <Text style={styles.toastText}>Aucun imprévu · tout roule</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Panel styles ──────────────────────────────────────────────────────────────

const panel = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(252,247,235,0.9)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    marginBottom: 16,
    shadowColor: '#4a3218',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: SERIF,
    fontSize: 19,
    color: TEXT_DARK,
    lineHeight: 22,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: LINE,
  },
  task: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E3D7C0',
    paddingVertical: 8,
  },
  taskLast: {
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    lineHeight: 17,
    flex: 1,
  },
  taskSub: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 16,
  },
  chevron: {
    fontSize: 20,
    color: TEXT_MUTED,
    lineHeight: 24,
    flexShrink: 0,
  },
});

const quick = StyleSheet.create({
  triGrid: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 8,
    paddingTop: 2,
  },
  triItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(223,231,204,0.28)',
    borderWidth: 1,
    borderColor: '#E3D7C0',
  },
  triIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: TEXT_DARK,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});

// ── Screen styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
  },
  topbar: {
    backgroundColor: '#063D34',
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#031e1a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuBtn: {
    marginRight: 10,
    padding: 4,
  },
  topbarTitle: {
    flex: 1,
    fontFamily: SERIF,
    fontSize: 22,
    color: '#fff8e9',
    letterSpacing: 0.2,
  },
  notifBtn: {
    width: 40,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtnAlert: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    width: 'auto',
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 5,
  },
  notifBadge: {
    backgroundColor: '#CC1F1F',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  body: {
    padding: 16,
    paddingTop: 48,
  },
  panelRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  panelFlex: {
    flex: 1,
    marginBottom: 0,
  },
  // fleet
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 1.2,
  },
  sectionBadge: {
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionCard: {
    backgroundColor: '#FAF5EB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#4a3218',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: CREAM,
  },
  fleetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  fleetAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fleetAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  fleetInfo: { flex: 1, gap: 2 },
  fleetName: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  fleetPoint: { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },
  fleetBadge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, flexShrink: 0 },
  fleetBadgeText: { fontSize: 11, fontWeight: '700' },
  // activity
  daySep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  daySepLine: { flex: 1, height: 1, backgroundColor: '#D8E0CC' },
  daySepText: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 0.4 },
  actAllGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  actAllGoodText: { fontSize: 13, fontWeight: '600', color: colors.status.terminee.fg, flex: 1 },
  actErrorList: {
    backgroundColor: '#FAF5EB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    overflow: 'hidden',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actErrorDivider: { height: 1, backgroundColor: CREAM, marginLeft: 15 },
  actErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  actErrorAccent: { width: 3, height: 36, borderRadius: 2, backgroundColor: colors.coral, flexShrink: 0 },
  actErrorInfo: { flex: 1, gap: 2 },
  actErrorName: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  actErrorDetail: { fontSize: 12, color: colors.coral, fontWeight: '500' },
  actErrorBadge: { backgroundColor: colors.coralLight, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
  actErrorBadgeText: { fontSize: 11, fontWeight: '700', color: colors.coral },
  // toast
  toast: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.status.terminee.bg,
    borderWidth: 1,
    borderColor: colors.status.terminee.border,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: TEXT_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: { fontSize: 13, fontWeight: '700', color: colors.status.terminee.fg },
});
