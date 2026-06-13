import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import MobileDrawer from '../components/MobileDrawer';
import SiteModal from '../components/SiteModal';
import { getClients, type Client } from '../services/clients';

export default function SitesScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteModalOpen, setSiteModalOpen] = useState(false);
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

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />

      {/* Topbar */}
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={s.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={colors.primaryLight} />
        </TouchableOpacity>
        <Text style={s.greeting}>
          Sites <Text style={s.greetingName}>de collecte</Text>
        </Text>
        <LinearGradient
          colors={[colors.primaryLight, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.avatar}
        >
          <Text style={s.avatarText}>N</Text>
        </LinearGradient>
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={s.pageHeader}>
          <View>
            <Text style={s.pageTitle}>Sites de collecte</Text>
            <Text style={s.pageSubtitle}>{clients.length} point{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={s.btnAdd} onPress={() => setSiteModalOpen(true)} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primaryLight} />
            <Text style={s.btnAddText}>Ajouter un site</Text>
          </TouchableOpacity>
        </View>

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
        ) : (
          <View style={s.listCard}>
            {clients.map((c, i) => (
              <View key={c.id ?? i} style={[s.siteItem, i > 0 && s.siteDivider]}>
                <View style={s.siteIconBox}>
                  <Ionicons name="location" size={16} color={colors.primaryLight} />
                </View>
                <View style={s.siteInfo}>
                  <Text style={s.siteName}>{c.nom_entreprise}</Text>
                  <Text style={s.siteCoords}>{c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

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
  greeting: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  greetingName: { color: colors.primaryLight },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 4,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  content: { flex: 1 },
  contentContainer: { padding: 24, paddingBottom: 40 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 3, fontWeight: '500' },

  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C8E8D4',
    backgroundColor: '#E8F5EE',
  },
  btnAddText: { fontSize: 13, fontWeight: '700', color: colors.primaryLight },

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

  listCard: {
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
  },
  siteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 12,
  },
  siteDivider: { borderTopWidth: 1, borderTopColor: '#F0F7F4' },
  siteIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center',
  },
  siteInfo: { flex: 1 },
  siteName: { fontSize: 14, fontWeight: '600', color: colors.text },
  siteCoords: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

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
