import React, { useEffect, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
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

const DATE_DEMO  = new Date().toISOString().split('T')[0];
const DATE_LABEL = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });

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
  lastUpdate,
  onGoPlanning,
  onGoImprevus,
}: {
  stats: DashboardStats | null;
  loading: boolean;
  hasAlerts: boolean;
  lastUpdate: string | null;
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
    : `Collecte\nen cours`;

  const desc = !isGenerated
    ? '\nLa journée n\'est pas encore préparée. \nOuvrez Planning pour vérifier les données\net lancer la génération.\n'
    : isDone
    ? `${stats!.collectes_total} collectes · ${stats!.poids_collecte_kg.toLocaleString('fr-FR')} kg collectés · ${stats!.km_total} km parcourus`
    : 'Les équipes sont sur le terrain.';

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

          {isGenerated && !isDone && lastUpdate && (
            <View style={hero.updateRow}>
              <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
              <Text style={hero.updateText}>Mise à jour : {lastUpdate}</Text>
            </View>
          )}

          {isGenerated && !isDone && (
            <View style={hero.ratioBox}>
              <Text style={hero.ratioVal}>
                {stats!.collectes_validees}
                <Text style={hero.ratioSlash}> / </Text>
                {stats!.collectes_total}
              </Text>
              <Text style={hero.ratioSub}>collectes validées</Text>
            </View>
          )}

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
  ratioBox: {
    marginTop: 6,
    marginBottom: 10,
  },
  ratioVal: {
    fontFamily: SERIF,
    fontSize: 38,
    lineHeight: 42,
    color: TEXT_DARK,
  },
  ratioSlash: {
    fontSize: 28,
    color: TEXT_MUTED,
  },
  ratioSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  updateText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
});


// ── MetricsRow (état actif — 3 métriques plates) ─────────────────────────────

function MetricsRow({ stats }: { stats: DashboardStats }) {
  const kgAnim = useRef(new Animated.Value(0)).current;
  const colAnim = useRef(new Animated.Value(0)).current;

  const kgPct = stats.poids_prevu_kg > 0
    ? Math.min(stats.poids_collecte_kg / stats.poids_prevu_kg, 1)
    : 0;
  const colPct = stats.collectes_total > 0
    ? Math.min(stats.collectes_validees / stats.collectes_total, 1)
    : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(kgAnim, { toValue: kgPct, duration: 900, delay: 100, useNativeDriver: false }),
      Animated.timing(colAnim, { toValue: colPct, duration: 900, delay: 200, useNativeDriver: false }),
    ]).start();
  }, [kgPct, colPct]);

  const pctLabel = Math.round(colPct * 100);

  return (
    <View style={met.row}>
      <View style={met.col}>
        <Text style={met.label}>BIODÉCHETS</Text>
        <Text style={met.value}>
          {stats.poids_collecte_kg.toLocaleString('fr-FR')}
          <Text style={met.unit}> kg</Text>
        </Text>
        <View style={met.track}>
          <Animated.View style={[met.fill, {
            width: kgAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: '#2D6A4F',
          }]} />
        </View>
        <Text style={met.sub}>sur {stats.poids_prevu_kg.toLocaleString('fr-FR')} kg</Text>
      </View>

      <View style={met.vline} />

      <View style={met.col}>
        <Text style={met.label}>COLLECTES</Text>
        <Text style={met.value}>
          {stats.collectes_validees}
          <Text style={met.unit}>/{stats.collectes_total}</Text>
        </Text>
        <View style={met.track}>
          <Animated.View style={[met.fill, {
            width: colAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: '#1A759F',
          }]} />
        </View>
        <Text style={met.sub}>validées · {pctLabel} %</Text>
      </View>

      <View style={met.vline} />

      <View style={met.col}>
        <Text style={met.label}>DISTANCE</Text>
        <Text style={met.value}>
          {stats.km_total}
          <Text style={met.unit}> km</Text>
        </Text>
        <View style={met.track}>
          <Animated.View style={[met.fill, { width: '100%', backgroundColor: TEXT_MUTED }]} />
        </View>
        <Text style={met.sub}>planifiés</Text>
      </View>
    </View>
  );
}

const met = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 28,
    paddingBottom: 16,
    marginBottom: 4,
  },
  col: {
    flex: 1,
    gap: 6,
  },
  vline: {
    width: 1,
    backgroundColor: LINE,
    marginHorizontal: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: TEXT_MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  value: {
    fontFamily: SERIF,
    fontSize: 22,
    color: TEXT_DARK,
    lineHeight: 26,
  },
  unit: {
    fontFamily: SERIF,
    fontSize: 14,
    color: TEXT_MUTED,
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  sub: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
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
        const now = new Date();
        setLastUpdate(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
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
        {/* Gauche : hamburger + titre */}
        <View style={styles.topbarLeft}>
          <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
            <Ionicons name="menu-outline" size={26} color="#fff8e9" />
          </TouchableOpacity>
          <Text style={styles.topbarTitle} numberOfLines={1}>Tableau de bord</Text>
        </View>

        {/* Centre : date */}
        <Text style={styles.topbarDate} numberOfLines={1}>{DATE_LABEL}</Text>

        {/* Droite : cloche + admin */}
        <View style={styles.topbarRight}>
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
          <View style={styles.adminTag}>
            <Text style={styles.adminTagText}>Admin</Text>
          </View>
        </View>
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
          lastUpdate={lastUpdate}
          onGoPlanning={() => router.push('/planning')}
          onGoImprevus={() => router.push('/imprevus')}
        />

        <View style={styles.body}>
          {/* Métriques plates — visible seulement si tournées générées */}
          {!loading && isGenerated && <MetricsRow stats={stats!} />}

          {/* ── À faire + Accès — côte à côte, sans cards ── */}
          <View style={flat.row}>

            {/* Colonne gauche — À faire / Priorités */}
            <View style={flat.col}>
              <View style={flat.sectionHeader}>
                <View style={flat.sectionRule} />
                <Text style={flat.sectionTitle}>{isGenerated ? 'PRIORITÉS' : 'À FAIRE'}</Text>
              </View>

              {/* Imprévus en premier quand actif */}
              {isGenerated && (
                <>
                  {hasAlerts ? (
                    <TouchableOpacity style={flat.item} onPress={() => router.push('/imprevus')} activeOpacity={0.75}>
                      <View style={[flat.accent, { backgroundColor: '#C43B25' }]} />
                      <Ionicons name="warning-outline" size={16} color="#C43B25" />
                      <View style={flat.itemBody}>
                        <Text style={[flat.itemTitle, { color: '#C43B25' }]} numberOfLines={1}>
                          {stats!.alertes} imprév{stats!.alertes > 1 ? 'us' : 'u'}
                        </Text>
                        <Text style={flat.itemSub}>Action requise.</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#C43B25" />
                    </TouchableOpacity>
                  ) : (
                    <View style={flat.item}>
                      <View style={[flat.accent, { backgroundColor: '#2D6A4F' }]} />
                      <Ionicons name="checkmark-circle-outline" size={16} color="#2D6A4F" />
                      <View style={flat.itemBody}>
                        <Text style={[flat.itemTitle, { color: '#2D6A4F' }]} numberOfLines={1}>Aucun imprévu</Text>
                        <Text style={flat.itemSub}>Tout roule.</Text>
                      </View>
                    </View>
                  )}

                  <View style={flat.divider} />

                  <TouchableOpacity style={flat.item} onPress={() => router.push('/planning')} activeOpacity={0.75}>
                    <View style={[flat.accent, { backgroundColor: '#5D8A6F' }]} />
                    <Ionicons name="calendar-outline" size={16} color={TEXT_DARK} />
                    <View style={flat.itemBody}>
                      <Text style={flat.itemTitle} numberOfLines={1}>Superviser</Text>
                      <Text style={flat.itemSub}>Suivez l'avancement.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={13} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </>
              )}

              {/* Affichage non-actif */}
              {!isGenerated && (
                <>
                  <View style={flat.item}>
                    <View style={[flat.accent, { backgroundColor: '#5D8A6F' }]} />
                    <Ionicons name="calendar-outline" size={16} color={TEXT_DARK} />
                    <View style={flat.itemBody}>
                      <Text style={flat.itemTitle} numberOfLines={2}>Préparer les tournées</Text>
                      <Text style={flat.itemSub}>Lancez la génération.</Text>
                    </View>
                  </View>

                  <View style={flat.divider} />

                  {hasAlerts ? (
                    <TouchableOpacity style={flat.item} onPress={() => router.push('/imprevus')} activeOpacity={0.75}>
                      <View style={[flat.accent, { backgroundColor: '#C43B25' }]} />
                      <Ionicons name="warning-outline" size={16} color="#C43B25" />
                      <View style={flat.itemBody}>
                        <Text style={[flat.itemTitle, { color: '#C43B25' }]} numberOfLines={1}>
                          {stats!.alertes} imprév{stats!.alertes > 1 ? 'us' : 'u'}
                        </Text>
                        <Text style={flat.itemSub}>Action requise.</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#C43B25" />
                    </TouchableOpacity>
                  ) : (
                    <View style={flat.item}>
                      <View style={[flat.accent, { backgroundColor: '#2D6A4F' }]} />
                      <Ionicons name="checkmark-circle-outline" size={16} color="#2D6A4F" />
                      <View style={flat.itemBody}>
                        <Text style={[flat.itemTitle, { color: '#2D6A4F' }]} numberOfLines={1}>Aucun imprévu</Text>
                        <Text style={flat.itemSub}>Tout roule.</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Séparateur vertical */}
            <View style={flat.vline} />

            {/* Colonne droite — Répartition km (actif) / Accès rapides (inactif) */}
            <View style={flat.col}>
              {isGenerated ? (
                <>
                  <View style={flat.sectionHeader}>
                    <View style={flat.sectionRule} />
                    <Text style={flat.sectionTitle}>RÉPARTITION KM</Text>
                  </View>
                  {stats!.flotte.map((f, i) => {
                    const nomVl = f.nom_vl ?? `VL${i + 1}`;
                    const dotColor = f.termine ? '#2D6A4F' : f.erreurs > 0 ? '#C43B25' : '#D4820A';
                    const pct = f.km != null && stats!.km_total > 0
                      ? Math.min(f.km / stats!.km_total, 1)
                      : null;
                    return (
                      <View key={i}>
                        {i > 0 && <View style={flat.divider} />}
                        <View style={km.row}>
                          <View style={[km.dot, { backgroundColor: dotColor }]} />
                          <View style={km.body}>
                            <Text style={km.vl}>{nomVl}</Text>
                            <Text style={km.driver} numberOfLines={1}>
                              {f.chauffeur.split(' ')[0]}
                            </Text>
                          </View>
                          <Text style={km.val}>
                            {f.km != null ? `${f.km} km` : '—'}
                          </Text>
                        </View>
                        {pct !== null && (
                          <View style={km.track}>
                            <View style={[km.fill, {
                              width: `${Math.round(pct * 100)}%`,
                              backgroundColor: dotColor,
                            }]} />
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {stats!.km_total > 0 && (
                    <Text style={km.note}>Total : {stats!.km_total} km</Text>
                  )}
                </>
              ) : (
                <>
                  <View style={flat.sectionHeader}>
                    <View style={flat.sectionRule} />
                    <Text style={flat.sectionTitle}>ACCÈS</Text>
                  </View>

                  <TouchableOpacity style={flat.item} onPress={() => router.push('/imprevus')} activeOpacity={0.75}>
                    <View style={[flat.accent, { backgroundColor: '#C43B25' }]} />
                    <Ionicons name="warning-outline" size={16} color="#C43B25" />
                    <Text style={[flat.itemTitle, { flex: 1 }]} numberOfLines={1}>Imprévus</Text>
                    <Ionicons name="chevron-forward" size={13} color={TEXT_MUTED} />
                  </TouchableOpacity>

                  <View style={flat.divider} />

                  <TouchableOpacity style={flat.item} onPress={() => router.push('/sites')} activeOpacity={0.75}>
                    <View style={[flat.accent, { backgroundColor: '#2D6A4F' }]} />
                    <Ionicons name="location-outline" size={16} color={TEXT_DARK} />
                    <Text style={[flat.itemTitle, { flex: 1 }]} numberOfLines={1}>Sites</Text>
                    <Ionicons name="chevron-forward" size={13} color={TEXT_MUTED} />
                  </TouchableOpacity>

                  <View style={flat.divider} />

                  <TouchableOpacity style={flat.item} onPress={() => router.push('/ressources')} activeOpacity={0.75}>
                    <View style={[flat.accent, { backgroundColor: TEXT_MUTED }]} />
                    <Ionicons name="document-text-outline" size={16} color={TEXT_DARK} />
                    <Text style={[flat.itemTitle, { flex: 1 }]} numberOfLines={1}>Ressources</Text>
                    <Ionicons name="chevron-forward" size={13} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </>
              )}
            </View>

          </View>

          {/* ── Flotte en temps réel (seulement si pas actif — sinon dans la colonne km) ── */}
          {!loading && !isGenerated && stats && stats.flotte.length > 0 && (() => {
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

          {/* ── Activité récente ── */}
          {!loading && activites.length > 0 && (() => {
            const shown = activites.slice(0, 5);
            const CAT_COLORS = {
              tournee:    { bg: '#E3EEF7', fg: '#1A759F', label: 'Tournée' },
              imprevue:   { bg: '#FDE8E3', fg: '#C43B25', label: 'Imprévu' },
              validation: { bg: '#E0F0E9', fg: '#2D6A4F', label: 'Validation' },
            } as const;
            return (
              <>
                <View style={act.section}>
                  <View style={flat.sectionHeader}>
                    <View style={flat.sectionRule} />
                    <Text style={flat.sectionTitle}>ACTIVITÉ RÉCENTE</Text>
                  </View>
                  {shown.map((a, i) => {
                    const isOk = a.statut === 'terminee';
                    const cat = a.categorie ?? (isOk ? 'validation' : 'imprevue');
                    const c   = CAT_COLORS[cat];
                    const stateSymbol = cat === 'tournee' ? '○' : isOk ? '✓' : '!';
                    const stateColor  = cat === 'tournee' ? '#1A759F' : isOk ? '#2D6A4F' : '#C43B25';
                    const actionLabel = a.action ?? (isOk ? 'Collecte validée' : 'Imprévu signalé');
                    const detailLabel = a.detail ?? a.client;
                    return (
                      <React.Fragment key={i}>
                        {i > 0 && <View style={flat.divider} />}
                        <View style={act.row}>
                          <View style={[act.state, { backgroundColor: stateColor }]}>
                            <Text style={act.stateText}>{stateSymbol}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={act.topLine}>
                              {a.heure ? (
                                <Text style={act.heure}>{a.heure}</Text>
                              ) : null}
                              <Text style={act.action} numberOfLines={1}>{actionLabel}</Text>
                            </View>
                            <Text style={act.detail} numberOfLines={1}>{detailLabel}</Text>
                          </View>
                          <View style={[act.tag, { backgroundColor: c.bg }]}>
                            <Text style={[act.tagText, { color: c.fg }]}>{c.label}</Text>
                          </View>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
              </>
            );
          })()}

          {/* ── Footer décoratif ── */}
          <View style={styles.footer}>
            <View style={styles.footerSep} />
            <Svg width={38} height={38} viewBox="0 0 38 38" fill="none">
              <Path
                d="M19 34 C19 34 19 17 19 11 C19 11 11 5 5 9 C5 9 9 21 19 23"
                stroke="#C8B99A"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M19 11 C19 11 27 5 33 9 C33 9 29 21 19 23"
                stroke="#C8B99A"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.footerText}>· LES ALCHIMISTES · VAR 83 ·</Text>
          </View>

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


// ── Activité récente styles ───────────────────────────────────────────────────

const act = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 28,
    paddingBottom: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  state: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heure: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    flexShrink: 0,
  },
  action: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    flex: 1,
  },
  detail: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '400',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

const km = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  body: {
    flex: 1,
  },
  vl: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_DARK,
    lineHeight: 15,
  },
  driver: {
    fontSize: 11,
    color: TEXT_MUTED,
    lineHeight: 14,
  },
  val: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DARK,
    flexShrink: 0,
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
    marginLeft: 16,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  note: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: 0.2,
  },
});

// ── Flat section styles (Option A — sans cards) ───────────────────────────────

const flat = StyleSheet.create({
  row: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: 'row',
    paddingTop: 28,
    paddingBottom: 14,
    marginBottom: 4,
  },
  col: {
    flex: 1,
  },
  vline: {
    width: 1,
    backgroundColor: LINE,
    marginHorizontal: 10,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 28,
    paddingBottom: 14,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionRule: {
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2D6A4F',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_DARK,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    gap: 12,
  },
  accent: {
    width: 3,
    height: 28,
    borderRadius: 2,
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
    flex: 1,
  },
  itemSub: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 2,
    marginLeft: 31,
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
    height: 76,
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
  topbarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topbarTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    color: '#fff8e9',
    flexShrink: 1,
  },
  topbarDate: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#fff8e9',
    letterSpacing: -0.2,
  },
  topbarRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  adminTag: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,248,233,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,233,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,248,233,0.7)',
    letterSpacing: 0.4,
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
  scrollContent: { paddingBottom: 24 },
  footer: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    gap: 10,
  },
  footerSep: {
    width: 36,
    height: 1,
    backgroundColor: LINE,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    color: TEXT_MUTED,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  body: {
    padding: 16,
    paddingTop: 16,
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
