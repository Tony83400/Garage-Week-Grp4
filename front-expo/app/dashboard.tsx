import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import MobileDrawer from '../components/MobileDrawer';
import { getDashboardStats, getActiviteRecente, type DashboardStats, type Activite } from '../services/dashboard';
import { useRouter } from 'expo-router';

const DATE_DEMO = new Date().toISOString().split('T')[0];

// ── Journée card — état + chiffres fusionnés ──────────────────────────────────

function JourneeCard({ stats, onGoPlanning, onGoImprevus }: {
  stats: DashboardStats | null;
  onGoPlanning: () => void;
  onGoImprevus: () => void;
}) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isGenerated = !!stats && stats.collectes_total > 0;
  const isDone = isGenerated && stats!.collectes_validees === stats!.collectes_total;
  const pct = (stats && stats.poids_prevu_kg > 0)
    ? Math.min(stats.poids_collecte_kg / stats.poids_prevu_kg, 1)
    : 0;

  useEffect(() => {
    if (!isGenerated) return;
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 900,
      delay: 150,
      useNativeDriver: false,
    }).start();
  }, [pct, isGenerated]);

  // État vide — pas de tournées générées
  if (!isGenerated) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onGoPlanning}
        style={[jc.card, { backgroundColor: '#F5F7F6', borderColor: '#D4E0DC' }]}
      >
        <View style={jc.emptyRow}>
          <View style={[jc.iconBox, { backgroundColor: '#E8EDEB' }]}>
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[jc.statusLabel, { color: colors.textMuted }]}>Tournées non générées</Text>
            <Text style={jc.statusSub}>Générer les tournées depuis Planning</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  const s = stats!;
  const enCoursVrai = Math.max(0, s.collectes_total - s.collectes_validees - s.alertes);
  const hasAlert = s.alertes > 0 && !isDone;

  // Feu de circulation : vert (terminée) / rouge (alerte) / ambre (en cours)
  const RED = { bg: '#FEE2E2', border: '#F87171', fg: '#CC1F1F', iconBg: '#FECACA' };

  const statusColor = isDone ? colors.status.terminee.fg : hasAlert ? RED.fg : colors.status.en_cours.fg;
  const statusBg    = isDone ? colors.status.terminee.bg : hasAlert ? RED.bg : colors.status.en_cours.bg;
  const statusBorder= isDone ? colors.status.terminee.border : hasAlert ? RED.border : colors.status.en_cours.border;
  const statusIconBg= isDone ? '#C8E8D4' : hasAlert ? RED.iconBg : '#F5D9A0';
  const statusIcon  = isDone ? 'checkmark-circle' : hasAlert ? 'alert-circle' : 'car-outline';
  const statusText  = isDone
    ? `Journée terminée · ${s.km_total} km parcourus`
    : hasAlert
      ? `Imprévus détectés · ${s.km_total} km planifiés`
      : `Tournées en cours · ${s.km_total} km planifiés`;
  const progressColor = isDone ? colors.status.terminee.fg : hasAlert ? RED.fg : colors.accent;

  const bottomSuffix = (() => {
    if (s.alertes === 0 && enCoursVrai === 0) return ' · tout validé';
    const parts: string[] = [];
    if (enCoursVrai > 0) parts.push(`${enCoursVrai} en cours`);
    if (s.alertes > 0)   parts.push(`${s.alertes} imprévu${s.alertes > 1 ? 's' : ''}`);
    return ' · ' + parts.join(' · ');
  })();

  return (
    <View style={[jc.card, { backgroundColor: statusBg, borderColor: statusBorder }]}>
      {/* Header statut */}
      <View style={jc.statusRow}>
        <View style={[jc.iconBox, { backgroundColor: statusIconBg }]}>
          <Ionicons name={statusIcon as any} size={18} color={statusColor} />
        </View>
        <Text style={[jc.statusLabel, { color: statusColor }]} numberOfLines={1}>{statusText}</Text>
      </View>

      <View style={[jc.sep, hasAlert && { backgroundColor: 'rgba(204,31,31,0.12)' }]} />

      {/* Biodéchets + progress */}
      <View style={jc.metricRow}>
        <Ionicons name="leaf-outline" size={14} color={colors.primaryLight} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={jc.metricTop}>
            <Text style={jc.metricValue}>
              {s.poids_collecte_kg.toLocaleString('fr-FR')}
              <Text style={jc.metricUnit}> kg</Text>
            </Text>
            <Text style={jc.metricRight}>
              sur {s.poids_prevu_kg.toLocaleString('fr-FR')} kg prévus
            </Text>
          </View>
          <View style={jc.progressTrack}>
            <Animated.View
              style={[
                jc.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Collectes */}
      <View style={jc.bottomRow}>
        <Ionicons name="checkmark-circle-outline" size={14} color={colors.secondary} />
        <Text style={jc.bottomText}>
          <Text style={jc.bottomBold}>{s.collectes_validees}/{s.collectes_total}</Text>
          {' '}collectes validées{bottomSuffix}
        </Text>
      </View>

      {/* Footer alerte — visible seulement si imprévus */}
      {hasAlert && (
        <TouchableOpacity onPress={onGoImprevus} activeOpacity={0.75} style={jc.alertFooter}>
          <Ionicons name="alert-circle-outline" size={14} color={RED.fg} />
          <Text style={[jc.alertFooterText, { color: RED.fg }]}>
            {s.alertes} impr{s.alertes > 1 ? 'évus' : 'évu'} à traiter
          </Text>
          <Ionicons name="chevron-forward" size={13} color={RED.fg} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const jc = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  sep: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 14,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  metricRight: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  bottomBold: {
    fontWeight: '700',
    color: colors.text,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231,111,81,0.2)',
  },
  alertFooterText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.coral,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);
  const toastAnim = useRef(new Animated.Value(0)).current;

  function showOkToast() {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }

  const hasAlerts = (stats?.alertes ?? 0) > 0;

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
          Bonjour, <Text style={styles.greetingName}>Nicolas</Text>
        </Text>
        <TouchableOpacity
          style={[styles.notifBtn, hasAlerts && styles.notifBtnAlert]}
          onPress={() => hasAlerts ? router.push('/imprevus') : showOkToast()}
          activeOpacity={0.75}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={hasAlerts ? '#CC1F1F' : colors.primaryLight}
          />
          {hasAlerts && (
            <View style={styles.notifCount}>
              <Text style={styles.notifCountText}>{stats!.alertes}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginTop: 40 }} />
        ) : (
          <>
            <JourneeCard
              stats={stats}
              onGoPlanning={() => router.push('/planning')}
              onGoImprevus={() => router.push('/imprevus')}
            />

            {/* Flotte en temps réel */}
            {stats && stats.flotte.length > 0 && (() => {
              const allDone    = stats.flotte.every(f => f.termine);
              const anyError   = stats.flotte.some(f => f.erreurs > 0);
              const globalBadgeBg = !allDone
                ? colors.status.en_cours.bg
                : anyError ? colors.coralLight : colors.status.terminee.bg;
              const globalBadgeFg = !allDone
                ? colors.status.en_cours.fg
                : anyError ? colors.coral : colors.status.terminee.fg;
              const globalBadgeLabel = !allDone ? 'En tournée' : anyError ? 'Terminé avec erreurs' : 'Terminé';
              return (
                <>
                  <View style={styles.sectionLabel}>
                    <Text style={styles.sectionLabelText}>
                      FLOTTE · {stats.flotte.length} CHAUFFEUR{stats.flotte.length > 1 ? 'S' : ''}
                    </Text>
                    <View style={[styles.sectionLabelBadge, { backgroundColor: globalBadgeBg }]}>
                      <Text style={[styles.sectionLabelBadgeText, { color: globalBadgeFg }]}>
                        {globalBadgeLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.sectionCard, { marginBottom: 14 }]}>
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
                            {(() => {
                              const hasErr = f.erreurs > 0;
                              const badgeBg = !f.termine
                                ? colors.status.en_cours.bg
                                : hasErr ? colors.coralLight : colors.status.terminee.bg;
                              const badgeFg = !f.termine
                                ? colors.status.en_cours.fg
                                : hasErr ? colors.coral : colors.status.terminee.fg;
                              const badgeLabel = !f.termine
                                ? 'En tournée'
                                : hasErr
                                  ? `Terminé · ${f.erreurs} erreur${f.erreurs > 1 ? 's' : ''}`
                                  : 'Terminé ✓';
                              return (
                                <View style={[styles.fleetBadge, { backgroundColor: badgeBg }]}>
                                  <Text style={[styles.fleetBadgeText, { color: badgeFg }]}>
                                    {badgeLabel}
                                  </Text>
                                </View>
                              );
                            })()}
                          </View>
                        </React.Fragment>
                      );
                    })}
                  </View>
                </>
              );
            })()}

            {/* Rapport de collectes */}
            {(() => {
              const successes = activites.filter(a => a.statut === 'terminee');
              const errors    = activites.filter(a => a.statut === 'erreur');
              const sepLabel  = errors.length > 0
                ? `Rapport · ${successes.length} réussie${successes.length !== 1 ? 's' : ''} · ${errors.length} erreur${errors.length > 1 ? 's' : ''}`
                : 'Rapport de collectes';

              return (
                <>
                  {/* Séparateur éditorial */}
                  <View style={styles.daySep}>
                    <View style={styles.daySepLine} />
                    <Text style={styles.daySepText}>{sepLabel}</Text>
                    <View style={styles.daySepLine} />
                  </View>

                  {/* Cas : aucune activité ou tout réussi → ligne verte sobre */}
                  {errors.length === 0 && (
                    <View style={styles.actAllGood}>
                      <Ionicons name="checkmark-circle" size={15} color={colors.status.terminee.fg} />
                      <Text style={styles.actAllGoodText}>
                        {activites.length === 0
                          ? 'Aucune collecte enregistrée pour cette journée'
                          : 'Toutes les collectes se sont bien passées'}
                      </Text>
                    </View>
                  )}

                  {/* Cas : erreurs → items flottants avec bande accent */}
                  {errors.length > 0 && (
                    <View style={styles.actErrorList}>
                      {errors.map((e, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <View style={styles.actErrorDivider} />}
                          <View style={styles.actErrorRow}>
                            <View style={styles.actErrorAccent} />
                            <View style={styles.actErrorInfo}>
                              <Text style={styles.actErrorName}>{e.client}</Text>
                              <Text style={styles.actErrorDetail}>Collecte en erreur</Text>
                            </View>
                            <View style={styles.actErrorBadge}>
                              <Text style={styles.actErrorBadgeText}>Erreur</Text>
                            </View>
                          </View>
                        </React.Fragment>
                      ))}
                    </View>
                  )}
                </>
              );
            })()}
          </>
        )}
      </ScrollView>

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoute="dashboard"
      />

      {/* Toast "tout va bien" */}
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
  notifBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtnAlert: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    paddingHorizontal: 10,
    width: 'auto',
    flexDirection: 'row',
    gap: 5,
  },
  notifCount: {
    backgroundColor: '#CC1F1F',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
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
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.status.terminee.fg,
  },
  content: { flex: 1 },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  sectionLabelBadge: {
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  sectionLabelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  daySep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
    paddingHorizontal: 2,
  },
  daySepLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D8E8E0',
  },
  daySepText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  actAllGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  actAllGoodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.status.terminee.fg,
    flex: 1,
  },
  actErrorList: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    paddingHorizontal: 16,
  },
  actErrorDivider: {
    height: 1,
    backgroundColor: colors.background,
    marginLeft: 15,
  },
  actErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  actErrorAccent: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: colors.coral,
    flexShrink: 0,
  },
  actErrorInfo: {
    flex: 1,
    gap: 2,
  },
  actErrorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  actErrorDetail: {
    fontSize: 12,
    color: colors.coral,
    fontWeight: '500',
  },
  actErrorBadge: {
    backgroundColor: colors.coralLight,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  actErrorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.coral,
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
  fleetAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fleetInfo: {
    flex: 1,
    gap: 2,
  },
  fleetName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  fleetPoint: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  fleetBadge: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  fleetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
