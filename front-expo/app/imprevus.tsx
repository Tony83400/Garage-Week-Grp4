import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';

// Données hardcodées — à remplacer par GET /api/imprevus quand le back sera prêt
type Imprevu = {
  id: number;
  nom: string;
  adresse: string;
  ville: string;
  chauffeur: string;
  raison: string;
  timeAgo: string;
};

const INITIAL_IMPREVUS: Imprevu[] = [
  {
    id: 1,
    nom: "McDonald's Toulon Mayol",
    adresse: '12 av. du Maréchal Foch',
    ville: 'Toulon',
    chauffeur: 'Marc Dubois',
    raison: 'Site inaccessible · camion trop grand',
    timeAgo: 'il y a 45 min',
  },
  {
    id: 2,
    nom: 'Hôtel Mercure Bandol',
    adresse: '3 allée Alfred Vivien',
    ville: 'Bandol',
    chauffeur: 'Sophie Martel',
    raison: 'Client absent à l\'arrivée',
    timeAgo: 'il y a 1h20',
  },
  {
    id: 3,
    nom: 'Cantine Collège Beaussier',
    adresse: 'Av. du 8 mai 1945',
    ville: 'La Seyne-sur-Mer',
    chauffeur: 'Thomas Riva',
    raison: 'Bac plein · volume imprévu',
    timeAgo: 'il y a 2h',
  },
];

// ── Item animé ────────────────────────────────────────────────────────────────

function ImprevuItem({
  item,
  onReplan,
  onDelete,
}: {
  item: Imprevu;
  onReplan: () => void;
  onDelete: () => void;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  function animateOut(callback: () => void) {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 80, duration: 260, useNativeDriver: true }),
    ]).start(() => callback());
  }

  return (
    <Animated.View style={[s.item, { opacity, transform: [{ translateX }] }]}>
      <View style={s.itemTop}>
        <View style={s.itemIconWrap}>
          <Ionicons name="location-outline" size={18} color={colors.coral} />
        </View>
        <View style={s.itemInfo}>
          <Text style={s.itemNom} numberOfLines={1}>{item.nom}</Text>
          <Text style={s.itemAdresse}>{item.adresse} · {item.ville}</Text>
        </View>
        <Text style={s.itemTime}>{item.timeAgo}</Text>
      </View>

      <View style={s.itemRaison}>
        <Ionicons name="warning-outline" size={13} color={colors.coral} />
        <Text style={s.itemRaisonText}>{item.raison}</Text>
      </View>

      <View style={s.itemMeta}>
        <Ionicons name="person-outline" size={12} color={colors.textMuted} />
        <Text style={s.itemChauffeur}>{item.chauffeur}</Text>
      </View>

      <View style={s.itemActions}>
        <TouchableOpacity
          style={s.btnReplan}
          onPress={() => animateOut(onReplan)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={14} color="#fff" />
          <Text style={s.btnReplanText}>Replanifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btnDelete}
          onPress={() => animateOut(onDelete)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={14} color={colors.coral} />
          <Text style={s.btnDeleteText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ImprevusScreen() {
  const router = useRouter();
  const [imprevus, setImprevus] = useState<Imprevu[]>(INITIAL_IMPREVUS);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  function handleReplan(item: Imprevu) {
    setImprevus(prev => prev.filter(i => i.id !== item.id));
    showToast(`↻ ${item.nom} ajouté au prochain planning`);
  }

  function handleDelete(item: Imprevu) {
    setImprevus(prev => prev.filter(i => i.id !== item.id));
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />

      {/* Topbar */}
      <View style={s.topbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.push('/planning')} activeOpacity={0.75}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={s.topbarCenter}>
          <Text style={s.topbarTitle}>Gestion des imprévus</Text>
          <Text style={s.topbarSub}>Sites passés · à replanifier</Text>
        </View>
        {imprevus.length > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{imprevus.length}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      {imprevus.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <Ionicons name="checkmark-circle-outline" size={52} color={colors.accent} />
          </View>
          <Text style={s.emptyTitle}>Aucun imprévu</Text>
          <Text style={s.emptySubtitle}>
            Quand un chauffeur passe un site (✕), il apparaîtra ici.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.sectionLabel}>
            {imprevus.length} site{imprevus.length !== 1 ? 's' : ''} à replanifier
          </Text>

          {imprevus.map(item => (
            <ImprevuItem
              key={item.id}
              item={item}
              onReplan={() => handleReplan(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ScrollView>
      )}

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
  container: { flex: 1, backgroundColor: colors.background },

  // Topbar
  topbar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EC',
    height: 68,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarCenter: { flex: 1 },
  topbarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  topbarSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  badge: {
    backgroundColor: colors.coralLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.25)',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coral,
  },

  // Content
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Item
  item: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.coralLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.2)',
  },
  itemInfo: { flex: 1 },
  itemNom: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  itemAdresse: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  itemRaison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.coralLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  itemRaisonText: {
    fontSize: 12,
    color: colors.coral,
    fontWeight: '600',
    flex: 1,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemChauffeur: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAF2EE',
    paddingTop: 10,
  },
  btnReplan: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  btnReplanText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  btnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(231,111,81,0.3)',
    backgroundColor: colors.coralLight,
  },
  btnDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coral,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 80,
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
