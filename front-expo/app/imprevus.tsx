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
import { getImprevus, replanifierImprevu, type Imprevu } from '../services/imprevus';

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
  animIndex = 0,
}: {
  item: Imprevu;
  onReport: () => void;
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
      </View>

      <View style={s.raisonRow}>
        <Ionicons name="warning-outline" size={13} color={colors.coral} />
        <Text style={s.raisonText} numberOfLines={2}>{item.raison}</Text>
      </View>

      <TouchableOpacity
        style={s.btnReport}
        onPress={() => animateOut(onReport)}
        activeOpacity={0.85}
      >
        <Ionicons name="calendar-outline" size={15} color="#fff" />
        <Text style={s.btnReportText}>Reporter demain</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Modale de confirmation ────────────────────────────────────────────────────

function ConfirmModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: Imprevu | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={!!item} animationType="fade" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.confirmSheet}>
          <View style={s.confirmIcon}>
            <Ionicons name="calendar-outline" size={26} color={colors.primaryLight} />
          </View>
          <Text style={s.confirmTitle}>Reporter cette collecte ?</Text>
          <Text style={s.confirmClient} numberOfLines={1}>{item?.client_nom}</Text>

          <View style={s.confirmDateRow}>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.primaryLight} />
            <Text style={s.confirmDate}>{tomorrowFR()}</Text>
          </View>

          {item?.raison && (
            <View style={s.confirmRaison}>
              <Ionicons name="warning-outline" size={12} color={colors.coral} />
              <Text style={s.confirmRaisonText} numberOfLines={2}>{item.raison}</Text>
            </View>
          )}

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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ImprevusScreen() {
  const router = useRouter();
  const [imprevus, setImprevus] = useState<Imprevu[]>([]);
  const [loading, setLoading] = useState(true);
  const [traites, setTraites] = useState(0);
  const [confirmItem, setConfirmItem] = useState<Imprevu | null>(null);
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
    async function fetchImprevus() {
      try {
        const data = await getImprevus(DATE_DEMO);
        setImprevus(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchImprevus();
  }, []);

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
        {imprevus.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{imprevus.length}</Text>
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
          <Text style={s.emptySub}>
            {traites > 0
              ? `${traites} imprevu${traites > 1 ? 's' : ''} résolu${traites > 1 ? 's' : ''} aujourd'hui`
              : 'Les erreurs signalées par les chauffeurs apparaîtront ici'}
          </Text>
          <TouchableOpacity style={s.btnRetour} onPress={() => router.push('/planning')} activeOpacity={0.8}>
            <Ionicons name="arrow-back-outline" size={15} color={colors.primaryLight} />
            <Text style={s.btnRetourText}>Retour au planning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {total > 0 && traites > 0 && (
            <View style={s.progressWrap}>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${Math.round((traites / total) * 100)}%` as any }]} />
              </View>
              <Text style={s.progressLabel}>{traites}/{total} traités</Text>
            </View>
          )}

          <Text style={s.sectionLabel}>{imprevus.length} à traiter</Text>

          {imprevus.map((item, i) => (
            <ImprevuCard
              key={item.tache_id}
              item={item}
              animIndex={i}
              onReport={() => setConfirmItem(item)}
            />
          ))}
        </ScrollView>
      )}

      <ConfirmModal
        item={confirmItem}
        onConfirm={handleConfirmReport}
        onCancel={() => setConfirmItem(null)}
      />

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
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
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
  countBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  progressWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  progressBarBg: {
    flex: 1, height: 6, backgroundColor: '#EAF2EE', borderRadius: 99, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 99 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: colors.primaryLight },

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
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    gap: 12,
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
  },
  raisonText: { fontSize: 12, color: colors.coral, fontWeight: '600', flex: 1, lineHeight: 17 },

  btnReport: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 12, borderRadius: 11,
    backgroundColor: colors.primaryLight,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 4, elevation: 2,
  },
  btnReportText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Modal confirmation
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  confirmSheet: {
    backgroundColor: colors.card,
    borderRadius: 22, padding: 24, width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
  },
  confirmIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 },
  confirmClient: { fontSize: 14, fontWeight: '600', color: colors.primaryLight, marginBottom: 14 },
  confirmDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5EE', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
    marginBottom: 12, width: '100%', justifyContent: 'center',
  },
  confirmDate: { fontSize: 14, fontWeight: '700', color: colors.primaryLight },
  confirmRaison: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.coralLight, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 20, width: '100%',
  },
  confirmRaisonText: { fontSize: 11, color: colors.coral, fontWeight: '500', flex: 1 },
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
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 4, elevation: 2,
  },
  btnConfirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
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
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
