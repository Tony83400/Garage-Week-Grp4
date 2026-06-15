import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Animated, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import MobileDrawer from '../components/MobileDrawer';
import SiteModal from '../components/SiteModal';
import SiteDetailModal from '../components/SiteDetailModal';
import { getClients, type Client } from '../services/clients';

function extractVille(adresse?: string): string {
  if (!adresse) return 'Autre';
  const match = adresse.match(/\d{5}\s+([^,]+)/);
  return match ? match[1].trim() : 'Autre';
}

export default function SitesScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [detailSite, setDetailSite] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  async function fetchClients() {
    setLoading(true);
    try {
      const list = await getClients();
      setClients(list);
    } catch (e) {
      console.warn('Sites fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  const filtered = search.trim()
    ? clients.filter(c => c.nom_entreprise.toLowerCase().includes(search.toLowerCase().trim()))
    : clients;

  const grouped = filtered.reduce((acc, c) => {
    const ville = extractVille(c.adresse);
    if (!acc[ville]) acc[ville] = [];
    acc[ville].push(c);
    return acc;
  }, {} as Record<string, Client[]>);

  const villesSorted = Object.keys(grouped).sort();

  function renderRow(c: Client, i: number) {
    return (
      <TouchableOpacity
        key={c.id ?? i}
        style={[s.siteItem, i > 0 && s.siteDivider]}
        onPress={() => setDetailSite(c)}
        activeOpacity={0.75}
      >
        <View style={s.siteIconBox}>
          <Ionicons name="location" size={16} color={colors.primaryLight} />
        </View>
        <View style={s.siteInfo}>
          <Text style={s.siteName}>{c.nom_entreprise}</Text>
          <Text style={s.siteAddr} numberOfLines={1}>
            {c.adresse || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ flexShrink: 0 }} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />

      {/* Topbar */}
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={s.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.topbarTitle}>Sites de collecte</Text>
          {!loading && (
            <Text style={s.topbarSub}>
              {clients.length} point{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Barre de recherche */}
      {!loading && clients.length > 0 && (
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un site…"
            placeholderTextColor={colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginTop: 40 }} />
        ) : clients.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconBox}>
              <Ionicons name="location-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>Aucun site enregistré</Text>
            <Text style={s.emptySub}>Ajoutez votre premier point de collecte</Text>
            <TouchableOpacity style={s.btnAddHero} onPress={() => setSiteModalOpen(true)} activeOpacity={0.85}>
              <LinearGradient colors={[colors.primaryLight, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnAddGradient}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={s.btnAddHeroText}>Ajouter un site</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.noResult}>
            <Ionicons name="search-outline" size={26} color={colors.textMuted} />
            <Text style={s.noResultText}>Aucun site trouvé pour "{search}"</Text>
          </View>
        ) : (
          <>
            {villesSorted.map(ville => (
              <View key={ville} style={s.group}>
                <View style={s.groupHeader}>
                  <Text style={s.groupTitle}>{ville}</Text>
                  <View style={s.groupBadge}>
                    <Text style={s.groupBadgeText}>{grouped[ville].length}</Text>
                  </View>
                </View>
                <View style={s.listCard}>
                  {grouped[ville].map((c, i) => renderRow(c, i))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB — ajouter un site */}
      {!loading && (
        <TouchableOpacity style={s.fab} onPress={() => setSiteModalOpen(true)} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.primaryLight, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.fabGradient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {toast && (
        <Animated.View style={[s.toast, { opacity: toastOpacity }]}>
          <Text style={s.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <SiteModal
        visible={siteModalOpen}
        onClose={() => setSiteModalOpen(false)}
        onSuccess={(msg) => { showToast(msg); fetchClients(); }}
      />
      <SiteDetailModal
        visible={detailSite !== null}
        client={detailSite}
        onClose={() => setDetailSite(null)}
        onDeleted={(id) => setClients(prev => prev.filter(c => c.id !== id))}
        onToast={showToast}
      />
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="sites" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EC',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },

  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },

  // Empty state
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    padding: 32,
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyIconBox: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#F0F4F2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 24 },
  btnAddHero: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  btnAddGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 13, justifyContent: 'center',
  },
  btnAddHeroText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // No result
  noResult: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 12,
  },
  noResultText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Grouped list
  group: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  groupBadge: {
    backgroundColor: '#E8F5EE',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#C8E8D4',
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  siteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  siteDivider: { borderTopWidth: 1, borderTopColor: '#F0F7F4' },
  siteIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  siteInfo: { flex: 1 },
  siteName: { fontSize: 14, fontWeight: '600', color: colors.text },
  siteAddr: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    borderRadius: 28,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
