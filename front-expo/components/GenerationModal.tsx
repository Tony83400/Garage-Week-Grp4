import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const VEHICLE_COLORS = [colors.primaryLight, colors.secondary, colors.accent, '#9B59B6', '#E67E22'];

interface Stop { poids_prevu_kg: number; statut: string; }
interface Vehicle {
  chauffeurNom: string;
  immatriculation: string;
  arrets: Stop[];
  distance_km: number;
  capaciteMaxKg: number;
}

interface Props {
  visible: boolean;
  vehicles: Vehicle[];
  date: string;
  kmTotal: number;
  onValider: () => void;
  onModifier: () => void;
}

function formatDateFR(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function GenerationModal({ visible, vehicles, date, kmTotal, onValider, onModifier }: Props) {
  const totalArrets = vehicles.reduce((acc, v) => acc + v.arrets.length, 0);
  const totalKm = kmTotal > 0 ? kmTotal : vehicles.reduce((acc, v) => acc + (v.distance_km || 0), 0);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIcon}>
              <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
            </View>
            <View style={s.headerText}>
              <Text style={s.title}>Planning généré</Text>
              <Text style={s.subtitle}>{formatDateFR(date)}</Text>
            </View>
          </View>

          {/* Stats globales */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{vehicles.length}</Text>
              <Text style={s.statLabel}>Véhicules</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{totalArrets}</Text>
              <Text style={s.statLabel}>Arrêts</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{Math.round(totalKm)} km</Text>
              <Text style={s.statLabel}>Distance</Text>
            </View>
          </View>

          {/* Liste des véhicules */}
          <ScrollView style={s.vehicleList} showsVerticalScrollIndicator={false}>
            {vehicles.map((v, i) => {
              const col = VEHICLE_COLORS[i % VEHICLE_COLORS.length];
              const poidsTotal = v.arrets.reduce((acc, a) => acc + (a.poids_prevu_kg || 0), 0);
              const pct = v.capaciteMaxKg > 0 ? Math.round((poidsTotal / v.capaciteMaxKg) * 100) : 0;
              return (
                <View key={i} style={s.vehicleRow}>
                  <View style={[s.vehicleDot, { backgroundColor: col }]} />
                  <View style={s.vehicleInfo}>
                    <Text style={s.vehicleName}>{v.chauffeurNom}</Text>
                    <Text style={s.vehicleMeta}>{v.immatriculation} · {pct}% capacité</Text>
                  </View>
                  <View style={s.vehicleStats}>
                    <Text style={s.vehicleArrets}>{v.arrets.length} arrêts</Text>
                    <Text style={s.vehicleKm}>{Math.round(v.distance_km || 0)} km</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Note */}
          <View style={s.note}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={s.noteText}>
              Vérifiez les tournées avant de valider. Les heures sont estimées.
            </Text>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={s.btnModifier} onPress={onModifier} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={16} color={colors.primaryLight} />
              <Text style={s.btnModifierText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnValider} onPress={onValider} activeOpacity={0.85}>
              <Ionicons name="checkmark-outline" size={16} color="#fff" />
              <Text style={s.btnValiderText}>Valider</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 24,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#EAF2EE' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },

  vehicleList: { maxHeight: 220 },

  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F7F4',
  },
  vehicleDot: { width: 10, height: 10, borderRadius: 5 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 14, fontWeight: '700', color: colors.text },
  vehicleMeta: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  vehicleStats: { alignItems: 'flex-end' },
  vehicleArrets: { fontSize: 13, fontWeight: '700', color: colors.primaryLight },
  vehicleKm: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 1 },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    margin: 16,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
  },
  noteText: { fontSize: 11, color: colors.textMuted, fontWeight: '500', flex: 1, lineHeight: 16 },

  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
  },
  btnModifier: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1.5, borderColor: '#C8E8D4',
    backgroundColor: '#E8F5EE',
  },
  btnModifierText: { fontSize: 14, fontWeight: '700', color: colors.primaryLight },
  btnValider: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  btnValiderText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
