import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import MobileDrawer from '../components/MobileDrawer';
import { RessourcesService, Camion, Chauffeur } from '../services/ressources';
import CamionModal from '../components/Ressources/CamionModal';
import ChauffeurModal from '../components/Ressources/ChauffeurModal';
import DispoChauffeurModal from '../components/Ressources/DispoChauffeurModal';

export default function RessourcesScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chauffeurs' | 'camions'>('chauffeurs');
  
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [camions, setCamions] = useState<Camion[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [camionModalOpen, setCamionModalOpen] = useState(false);
  const [chauffeurModalOpen, setChauffeurModalOpen] = useState(false);
  
  const [selectedChauffeurForDispo, setSelectedChauffeurForDispo] = useState<Chauffeur | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'chauffeurs') {
        const list = await RessourcesService.getChauffeurs();
        setChauffeurs(list);
      } else {
        const list = await RessourcesService.getCamions();
        setCamions(list);
      }
    } catch (e) {
      console.warn('Ressources fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  function renderChauffeurRow(c: Chauffeur, i: number) {
    return (
      <TouchableOpacity
        key={c.id}
        style={[s.listItem, i > 0 && s.listDivider]}
        onPress={() => setSelectedChauffeurForDispo(c)}
        activeOpacity={0.75}
      >
        <View style={s.iconBox}>
          <Ionicons name="person" size={16} color={colors.primaryLight} />
        </View>
        <View style={s.listInfo}>
          <Text style={s.itemName}>{c.prenom} {c.nom}</Text>
          <Text style={s.itemSub} numberOfLines={1}>
            {c.email} {c.telephone ? `• ${c.telephone}` : ''}
          </Text>
        </View>
        <View style={s.actionBtn}>
          <Ionicons name="calendar-outline" size={14} color={colors.primaryLight} style={{marginRight: 4}} />
          <Text style={s.actionBtnText}>Dispos</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderCamionRow(c: Camion, i: number) {
    return (
      <View key={c.id} style={[s.listItem, i > 0 && s.listDivider]}>
        <View style={s.iconBox}>
          <Ionicons name="bus" size={16} color={colors.primaryLight} />
        </View>
        <View style={s.listInfo}>
          <Text style={s.itemName}>{c.immatriculation}</Text>
          <Text style={s.itemSub} numberOfLines={1}>
            Max: {c.charge_max_kg} kg • Bacs: {c.bacs_max}
          </Text>
        </View>
      </View>
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
          <Text style={s.topbarTitle}>Ressources</Text>
          <Text style={s.topbarSub}>Flotte & Équipe</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsContainer}>
        <TouchableOpacity 
          style={[s.tabBtn, activeTab === 'chauffeurs' && s.tabBtnActive]}
          onPress={() => setActiveTab('chauffeurs')}
        >
          <Text style={[s.tabText, activeTab === 'chauffeurs' && s.tabTextActive]}>Chauffeurs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.tabBtn, activeTab === 'camions' && s.tabBtnActive]}
          onPress={() => setActiveTab('camions')}
        >
          <Text style={[s.tabText, activeTab === 'camions' && s.tabTextActive]}>Camions</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginTop: 40 }} />
        ) : activeTab === 'chauffeurs' ? (
          <View style={s.listCard}>
            {chauffeurs.length === 0 ? (
               <Text style={s.emptyText}>Aucun chauffeur</Text>
            ) : chauffeurs.map((c, i) => renderChauffeurRow(c, i))}
          </View>
        ) : (
          <View style={s.listCard}>
            {camions.length === 0 ? (
               <Text style={s.emptyText}>Aucun camion</Text>
            ) : camions.map((c, i) => renderCamionRow(c, i))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {!loading && (
        <TouchableOpacity 
          style={s.fab} 
          onPress={() => activeTab === 'chauffeurs' ? setChauffeurModalOpen(true) : setCamionModalOpen(true)} 
          activeOpacity={0.85}
        >
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

      {/* Modals */}
      {camionModalOpen && (
        <CamionModal 
          visible={camionModalOpen} 
          onClose={() => setCamionModalOpen(false)} 
          onSuccess={(msg) => { showToast(msg); fetchData(); }} 
        />
      )}
      
      {chauffeurModalOpen && (
        <ChauffeurModal 
          visible={chauffeurModalOpen} 
          onClose={() => setChauffeurModalOpen(false)} 
          onSuccess={(msg) => { showToast(msg); fetchData(); }} 
        />
      )}

      {selectedChauffeurForDispo && (
        <DispoChauffeurModal
          visible={!!selectedChauffeurForDispo}
          chauffeur={selectedChauffeurForDispo}
          onClose={() => setSelectedChauffeurForDispo(null)}
          onSuccess={(msg) => { showToast(msg); }}
        />
      )}

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="ressources" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topbar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: '#E8F0EC',
    height: 68, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  menuBtn: { marginRight: 12, padding: 4 },
  topbarTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  topbarSub: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 1 },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderBottomWidth: 1, borderBottomColor: '#E8F0EC',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primaryLight,
  },

  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },

  listCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1, borderColor: '#EAF2EE',
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '500'
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  listDivider: { borderTopWidth: 1, borderTopColor: '#F0F7F4' },
  iconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center',
  },
  listInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },

  fab: {
    position: 'absolute', bottom: 28, right: 24, borderRadius: 28,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 8,
  },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },

  toast: {
    position: 'absolute', top: 80, right: 24, left: 24,
    backgroundColor: colors.primaryDark,
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
