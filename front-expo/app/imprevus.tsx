import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import { getImprevus, replanifierImprevu, reassignerImprevuDynamique, type Imprevu } from '../services/imprevus';
import { getPlanningAdmin, genererBrouillons, optimiserTournees, type TourneeAdmin } from '../services/planning';

const TYPE_LABELS: Record<string, string> = {
  poids_atteint:          'Benne pleine',
  client_absent:          'Client absent',
  bac_absent:             'Bac absent',
  acces_impossible:       'Accès impossible',
  chauffeur_indisponible: 'Chauffeur indispo',
  autre:                  'Autre',
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  poids_atteint:          'trash-outline',
  client_absent:          'person-remove-outline',
  bac_absent:             'cube-outline',
  acces_impossible:       'ban-outline',
  chauffeur_indisponible: 'car-outline',
  autre:                  'ellipsis-horizontal-outline',
};

const DATE_DEMO = new Date().toISOString().split('T')[0];

function tomorrowFR() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Carte imprevu ─────────────────────────────────────────────────────────────

function ImprevuCard({
  item,
  onReport,
  onReassign,
  animIndex = 0,
}: {
  item: Imprevu;
  onReport: () => void;
  onReassign: () => void;
  animIndex?: number;
}) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, delay: animIndex * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: animIndex * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  function animateOut(callback: () => void) {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 220, useNativeDriver: true }),
    ]).start(() => callback());
  }

  const typeKey  = item.type_imprevu || 'autre';
  const typeLabel = TYPE_LABELS[typeKey] ?? typeKey;
  const typeIcon  = TYPE_ICONS[typeKey] ?? 'ellipsis-horizontal-outline';

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }] }]}>
      <View style={s.cardTop}>
        <View style={s.cardIconWrap}>
          <Ionicons name="location" size={18} color={colors.coral} />
        </View>
        <View style={s.cardInfo}>
          <Text style={s.cardNom} numberOfLines={1}>{item.client_nom}</Text>
          {item.chauffeur && item.chauffeur !== 'Inconnu' && (
            <View style={s.cardMeta}>
              <Ionicons name="person-outline" size={11} color={colors.textMuted} />
              <Text style={s.cardMetaText}>{item.chauffeur}</Text>
              {item.heure && item.heure !== 'N/A' && (
                <>
                  <Text style={s.cardMetaSep}>·</Text>
                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                  <Text style={s.cardMetaText}>{item.heure}</Text>
                </>
              )}
            </View>
          )}
        </View>
        <View style={s.typeBadge}>
          <Ionicons name={typeIcon} size={11} color={colors.coral} />
          <Text style={s.typeBadgeText}>{typeLabel}</Text>
        </View>
      </View>

      <View style={s.raisonRow}>
        <Ionicons name="warning-outline" size={13} color={colors.coral} />
        <Text style={s.raisonText} numberOfLines={2}>{item.raison}</Text>
      </View>

      <View style={s.cardActions}>
        <TouchableOpacity
          style={s.btnReassign}
          onPress={onReassign}
          activeOpacity={0.85}
        >
          <Ionicons name="hand-right-outline" size={15} color={colors.primaryLight} />
          <Text style={s.btnReassignText}>Force Manuelle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.btnReport}
          onPress={() => animateOut(onReport)}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
          <Text style={s.btnReportText}>Reporter à demain</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Modales ───────────────────────────────────────────────────────────────────

function ConfirmModal({ item, onConfirm, onCancel }: any) {
    // ... Gardé identique (cf code précédent pour le report à demain)
    return (
        <Modal visible={!!item} animationType="fade" transparent statusBarTranslucent>
          <View style={s.overlay}>
            <View style={s.confirmSheet}>
              <View style={s.confirmIcon}>
                <Ionicons name="calendar-outline" size={26} color={colors.primaryLight} />
              </View>
              <Text style={s.confirmTitle}>Reporter cette collecte ?</Text>
              <Text style={s.confirmClient} numberOfLines={1}>{item?.client_nom}</Text>
              <View style={s.confirmActions}>
                <TouchableOpacity style={s.btnCancel} onPress={onCancel} activeOpacity={0.8}>
                  <Text style={s.btnCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnConfirm} onPress={onConfirm} activeOpacity={0.85}>
                  <Ionicons name="checkmark-outline" size={15} color="#fff" />
                  <Text style={s.btnConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      );
}

function ReassignModal({ item, tournees, isRecalculating, onConfirm, onCancel }: any) {
  if (!item) return null;
  return (
    <Modal visible={!!item} animationType="slide" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.confirmSheet}>
          {isRecalculating ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator size="large" color={colors.primaryLight} />
              <Text style={{ marginTop: 15, fontSize: 15, fontWeight: '600', color: colors.primaryLight }}>Recalcul IA en cours...</Text>
            </View>
          ) : (
            <>
              <View style={s.confirmIcon}>
                <Ionicons name="git-network-outline" size={26} color={colors.primaryLight} />
              </View>
              <Text style={s.confirmTitle}>Forcer l'assignation</Text>
              <Text style={s.sectionLabel}>Mode de secours manuel :</Text>
              <View style={{ width: '100%', marginBottom: 20 }}>
                {tournees.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: colors.textMuted }}>Aucune tournée en cours.</Text>
                ) : (
                  tournees.map((t: any) => (
                    <TouchableOpacity key={t.tournee_id} style={s.tourneeBtn} onPress={() => onConfirm(t.tournee_id)}>
                      <Ionicons name="car-outline" size={18} color={colors.text} />
                      <Text style={s.tourneeBtnText}>{t.chauffeur} (Tournée {t.tournee_id})</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <TouchableOpacity style={[s.btnCancel, {width: '100%'}]} onPress={onCancel} activeOpacity={0.8}>
                <Text style={s.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ImprevusScreen() {
  const router = useRouter();
  const [imprevus, setImprevus] = useState<Imprevu[]>([]);
  const [tournees, setTournees] = useState<TourneeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [traites, setTraites] = useState(0);
  
  const [confirmItem, setConfirmItem] = useState<Imprevu | null>(null);
  const [reassignItem, setReassignItem] = useState<Imprevu | null>(null);
  
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRegeneratingGlobal, setIsRegeneratingGlobal] = useState(false); // <--- L'état du gros bouton magique
  
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [dataImprevus, dataTournees] = await Promise.all([
        getImprevus(DATE_DEMO),
        getPlanningAdmin(DATE_DEMO)
      ]);
      setImprevus(dataImprevus);
      setTournees(dataTournees);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // 1. Action : Report Classique (à demain)
  async function handleConfirmReport() {
    if (!confirmItem) return;
    const item = confirmItem;
    setConfirmItem(null);
    try {
      await replanifierImprevu(item.tache_id);
      setImprevus(prev => prev.filter(i => i.tache_id !== item.tache_id));
      setTraites(t => t + 1);
      showToast(`Reporté demain · ${item.client_nom}`);
    } catch {
      showToast('Erreur lors du report');
    }
  }

  // 2. Action : Réassignation Manuelle (Secours)
  async function handleReassignDynamique(tournee_id: number) {
    if (!reassignItem) return;
    const item = reassignItem;
    setIsRecalculating(true);
    try {
      await reassignerImprevuDynamique(item.tache_id, tournee_id);
      setTimeout(() => {
        setImprevus(prev => prev.filter(i => i.tache_id !== item.tache_id));
        setTraites(t => t + 1);
        setIsRecalculating(false);
        setReassignItem(null);
        showToast(`Imprévu forcé dans la tournée ${tournee_id} !`);
      }, 500);
    } catch (e) {
      setIsRecalculating(false);
      showToast('Erreur lors du recalcul');
    }
  }

  // 3. ✨ LA NOUVELLE ACTION MAGIQUE (Régénérer IA)
  async function handleRegenererIA() {
    setIsRegeneratingGlobal(true);
    try {
      // Étape 1 : On boucle pour détacher TOUS les imprévus affichés à l'écran
      // (Cela équivaut à cliquer sur 'Reporter' en arrière-plan pour les libérer)
      for (const item of imprevus) {
          await replanifierImprevu(item.tache_id);
      }

      // Étape 2 : On supprime les vieux brouillons (sans toucher aux camions partis)
      await genererBrouillons(DATE_DEMO);
      
      // Étape 3 : L'IA OR-Tools refait un planning parfait avec les camions dispo
      await optimiserTournees(DATE_DEMO);

      // Étape 4 : On met à jour l'écran, les imprévus réassignés auront disparu
      await fetchData();
      
      setTraites(t => t + imprevus.length);
      showToast(`✨ IA : Tout a été réassigné de manière optimale !`);
    } catch (error) {
      console.error(error);
      showToast("L'IA n'a pas pu replacer tout le monde...");
    } finally {
      setIsRegeneratingGlobal(false);
    }
  }

  const total = imprevus.length + traites;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />

      {/* Topbar */}
      <View style={s.topbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.push('/planning')} activeOpacity={0.75}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={s.topbarCenter}>
          <Text style={s.topbarTitle}>Imprévus</Text>
          <Text style={s.topbarSub}>
            {loading ? '...' : total === 0 ? "Aucun problème aujourd'hui" : `${traites} / ${total} traité${traites > 1 ? 's' : ''}`}
          </Text>
        </View>
        {total > 0 && (
          <View style={[s.countBadge, imprevus.length === 0 && s.countBadgeDone]}>
            {imprevus.length > 0
              ? <Text style={s.countBadgeText}>{imprevus.length}</Text>
              : <Ionicons name="checkmark" size={16} color="#fff" />
            }
          </View>
        )}
      </View>

      {/* Contenu */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      ) : imprevus.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="checkmark-circle-outline" size={52} color={colors.accent} />
          </View>
          <Text style={s.emptyTitle}>
            {traites > 0 ? 'Tout est traité !' : 'Aucun imprevu'}
          </Text>
          <TouchableOpacity style={s.btnRetour} onPress={() => router.push('/planning')} activeOpacity={0.8}>
            <Ionicons name="arrow-back-outline" size={15} color={colors.primaryLight} />
            <Text style={s.btnRetourText}>Retour au planning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* ✨ LE BOUTON MAGIQUE */}
          <View style={s.globalActionContainer}>
              <TouchableOpacity 
                  style={[s.btnRegenererGlobal, isRegeneratingGlobal && { opacity: 0.7 }]}
                  onPress={handleRegenererIA}
                  disabled={isRegeneratingGlobal}
                  activeOpacity={0.8}
              >
                  {isRegeneratingGlobal ? (
                      <ActivityIndicator color="#fff" size="small" />
                  ) : (
                      <Ionicons name="sparkles" size={20} color="#fff" />
                  )}
                  <Text style={s.btnRegenererGlobalText}>
                      {isRegeneratingGlobal ? "Optimisation de la journée en cours..." : "Régénérer IA"}
                  </Text>
              </TouchableOpacity>
              <Text style={s.globalActionSub}>
                  L'IA va automatiquement dispatcher les imprévus ci-dessous dans les camions disponibles.
              </Text>
          </View>

          <Text style={s.sectionLabel}>{imprevus.length} Imprévu(s) détecté(s)</Text>

          {imprevus.map((item, i) => (
            <ImprevuCard
              key={item.tache_id}
              item={item}
              animIndex={i}
              onReport={() => setConfirmItem(item)}
              onReassign={() => setReassignItem(item)}
            />
          ))}
        </ScrollView>
      )}

      <ConfirmModal item={confirmItem} onConfirm={handleConfirmReport} onCancel={() => setConfirmItem(null)} />
      <ReassignModal item={reassignItem} tournees={tournees} isRecalculating={isRecalculating} onConfirm={handleReassignDynamique} onCancel={() => setReassignItem(null)} />

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
  container: { flex: 1, backgroundColor: colors.background },

  topbar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: '#E8F0EC',
    height: 68, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  topbarCenter: { flex: 1 },
  topbarTitle: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  topbarSub: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 1 },
  countBadge: {
    backgroundColor: colors.coral,
    borderRadius: 20, minWidth: 28, height: 28, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeDone: { backgroundColor: colors.status.terminee.fg },
  countBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Nouveaux styles pour le bouton Global
  globalActionContainer: {
      backgroundColor: '#E8F5EE',
      padding: 16,
      borderRadius: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#C8E8D4',
      alignItems: 'center',
  },
  btnRegenererGlobal: {
      backgroundColor: colors.primaryLight,
      width: '100%',
      paddingVertical: 14,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      shadowColor: colors.primaryLight,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnRegenererGlobalText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
  },
  globalActionSub: {
      fontSize: 12,
      color: colors.primaryLight,
      textAlign: 'center',
      marginTop: 10,
      fontWeight: '600'
  },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 1,
    borderColor: colors.status.erreur.border,
    borderLeftWidth: 4, borderLeftColor: colors.coral,
    padding: 16, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: colors.coralLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(231,111,81,0.2)',
  },
  cardInfo: { flex: 1 },
  cardNom: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardMetaText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  cardMetaSep: { fontSize: 12, color: colors.textMuted, opacity: 0.4 },

  raisonRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: colors.coralLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    marginVertical: 12,
  },
  raisonText: { fontSize: 12, color: colors.coral, fontWeight: '600', flex: 1, lineHeight: 17 },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.coralLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: colors.coral },

  cardActions: { flexDirection: 'row', gap: 8 },
  btnReassign: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 10, borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#D4E0DC',
  },
  btnReassignText: { fontSize: 12, fontWeight: '700', color: colors.primaryLight },
  btnReport: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 10, borderRadius: 11,
    backgroundColor: '#f8f9fa',
    borderWidth: 1, borderColor: '#e9ecef',
  },
  btnReportText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  confirmSheet: {
    backgroundColor: colors.card,
    borderRadius: 22, padding: 24, width: '100%',
    alignItems: 'center',
  },
  confirmIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 },
  confirmClient: { fontSize: 14, fontWeight: '600', color: colors.primaryLight, marginBottom: 14 },
  
  tourneeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#e9ecef'
  },
  tourneeBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },

  confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
  btnCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 11,
    borderWidth: 1, borderColor: '#D4E0DC',
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancelText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  btnConfirm: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 11,
    backgroundColor: colors.primaryLight,
  },
  btnConfirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  btnRetour: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#C8E8D4', backgroundColor: '#E8F5EE',
  },
  btnRetourText: { fontSize: 13, fontWeight: '700', color: colors.primaryLight },

  toast: {
    position: 'absolute', top: 80, right: 20, left: 20,
    backgroundColor: colors.primaryDark, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});