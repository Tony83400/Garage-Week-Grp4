import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const VEHICLE_COLORS = [colors.primaryLight, colors.secondary, colors.accent, '#9B59B6', '#E67E22'];

interface Stop {
  tache_id: number;
  client_nom: string;
  ordre: number;
  heure_estimee?: string;
  poids_prevu_kg: number;
  statut: string;
  latitude?: number;
  longitude?: number;
}

interface Vehicle {
  chauffeurId: number;
  chauffeurNom: string;
  heureDepart: string;
  heureFin: string;
  immatriculation: string;
  capaciteMaxKg: number;
  distance_km: number;
  arrets: Stop[];
}

interface Props {
  visible: boolean;
  vehicles: Vehicle[];
  onSave: (updated: Vehicle[]) => void;
  onClose: () => void;
}

export default function EditPlanningModal({ visible, vehicles, onSave, onClose }: Props) {
  const [data, setData] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [transferringId, setTransferringId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setData(vehicles.map(v => ({ ...v, arrets: v.arrets.map(a => ({ ...a })) })));
      setActiveTab(0);
      setTransferringId(null);
    }
  }, [visible, vehicles]);

  function moveUp(vIdx: number, sIdx: number) {
    if (sIdx === 0) return;
    const next = data.map(v => ({ ...v, arrets: [...v.arrets] }));
    const arr = next[vIdx].arrets;
    [arr[sIdx - 1], arr[sIdx]] = [arr[sIdx], arr[sIdx - 1]];
    arr.forEach((a, i) => { a.ordre = i + 1; });
    setData(next);
  }

  function moveDown(vIdx: number, sIdx: number) {
    if (sIdx === data[vIdx].arrets.length - 1) return;
    const next = data.map(v => ({ ...v, arrets: [...v.arrets] }));
    const arr = next[vIdx].arrets;
    [arr[sIdx], arr[sIdx + 1]] = [arr[sIdx + 1], arr[sIdx]];
    arr.forEach((a, i) => { a.ordre = i + 1; });
    setData(next);
  }

  function transferStop(fromVIdx: number, sIdx: number, toVIdx: number) {
    const next = data.map(v => ({ ...v, arrets: [...v.arrets] }));
    const [stop] = next[fromVIdx].arrets.splice(sIdx, 1);
    next[fromVIdx].arrets.forEach((a, i) => { a.ordre = i + 1; });
    next[toVIdx].arrets.push({ ...stop, ordre: next[toVIdx].arrets.length + 1 });
    setData(next);
    setTransferringId(null);
  }

  if (data.length === 0) return null;

  const currentVehicle = data[activeTab];
  const currentColor = VEHICLE_COLORS[activeTab % VEHICLE_COLORS.length];
  const totalArrets = data.reduce((acc, v) => acc + v.arrets.length, 0);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={s.root}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.75}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Modifier le planning</Text>
            <Text style={s.headerSub}>{totalArrets} arrêts · {data.length} véhicules</Text>
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={() => onSave(data)} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>Valider</Text>
          </TouchableOpacity>
        </View>

        {/* Note heures */}
        <View style={s.noteBar}>
          <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
          <Text style={s.noteText}>
            Les heures estimées (~) ne sont plus garanties après modification manuelle.
          </Text>
        </View>

        {/* Onglets chauffeurs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabsScroll}
          contentContainerStyle={s.tabsContent}
        >
          {data.map((v, i) => {
            const col = VEHICLE_COLORS[i % VEHICLE_COLORS.length];
            const active = i === activeTab;
            return (
              <TouchableOpacity
                key={v.chauffeurId}
                style={[s.tab, active && { borderBottomColor: col, borderBottomWidth: 2 }]}
                onPress={() => { setActiveTab(i); setTransferringId(null); }}
                activeOpacity={0.75}
              >
                <View style={[s.tabDot, { backgroundColor: col }]} />
                <Text style={[s.tabText, active && { color: col, fontWeight: '700' }]}>
                  {v.chauffeurNom.split(' ')[0]}
                </Text>
                <View style={[s.tabBadge, { backgroundColor: col + '22' }]}>
                  <Text style={[s.tabBadgeText, { color: col }]}>{v.arrets.length}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Infos véhicule actif */}
        <View style={[s.vehicleBar, { borderLeftColor: currentColor }]}>
          <Ionicons name="car-outline" size={13} color={colors.textMuted} />
          <Text style={s.vehicleBarText}>
            {currentVehicle.immatriculation} · {currentVehicle.heureDepart} → {currentVehicle.heureFin} · max {currentVehicle.capaciteMaxKg} kg
          </Text>
        </View>

        {/* Liste des arrêts */}
        <ScrollView style={s.stopsList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {currentVehicle.arrets.length === 0 ? (
            <View style={s.emptyTab}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.accentLight} />
              <Text style={s.emptyTabText}>Aucun arrêt pour ce chauffeur</Text>
            </View>
          ) : (
            currentVehicle.arrets.map((stop, sIdx) => {
              const isTransferring = transferringId === stop.tache_id;
              return (
                <View key={stop.tache_id}>
                  <View style={s.stopRow}>
                    {/* Numéro */}
                    <View style={[s.stopNum, { borderColor: currentColor + '60', backgroundColor: currentColor + '12' }]}>
                      <Text style={[s.stopNumText, { color: currentColor }]}>{stop.ordre}</Text>
                    </View>

                    {/* Infos */}
                    <View style={s.stopInfo}>
                      <Text style={s.stopName} numberOfLines={1}>{stop.client_nom}</Text>
                      <View style={s.stopMeta}>
                        {stop.heure_estimee && (
                          <Text style={s.stopMetaText}>~{stop.heure_estimee}</Text>
                        )}
                        {stop.poids_prevu_kg > 0 && (
                          <Text style={s.stopMetaText}>· {stop.poids_prevu_kg} kg</Text>
                        )}
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={s.stopActions}>
                      <TouchableOpacity
                        style={[s.actionBtn, sIdx === 0 && s.actionBtnDisabled]}
                        onPress={() => moveUp(activeTab, sIdx)}
                        disabled={sIdx === 0}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-up" size={14} color={sIdx === 0 ? '#D4E0DC' : colors.primaryLight} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, sIdx === currentVehicle.arrets.length - 1 && s.actionBtnDisabled]}
                        onPress={() => moveDown(activeTab, sIdx)}
                        disabled={sIdx === currentVehicle.arrets.length - 1}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-down" size={14} color={sIdx === currentVehicle.arrets.length - 1 ? '#D4E0DC' : colors.primaryLight} />
                      </TouchableOpacity>
                      {data.length > 1 && (
                        <TouchableOpacity
                          style={[s.actionBtn, isTransferring && s.actionBtnActive]}
                          onPress={() => setTransferringId(isTransferring ? null : stop.tache_id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="swap-horizontal-outline"
                            size={14}
                            color={isTransferring ? colors.primaryLight : colors.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Picker de transfert inline */}
                  {isTransferring && (
                    <View style={s.transferPicker}>
                      <Text style={s.transferLabel}>Transférer vers :</Text>
                      <View style={s.transferOptions}>
                        {data.map((v, vi) => {
                          if (vi === activeTab) return null;
                          const col = VEHICLE_COLORS[vi % VEHICLE_COLORS.length];
                          return (
                            <TouchableOpacity
                              key={v.chauffeurId}
                              style={[s.transferChip, { borderColor: col + '60', backgroundColor: col + '12' }]}
                              onPress={() => transferStop(activeTab, sIdx, vi)}
                              activeOpacity={0.8}
                            >
                              <View style={[s.transferDot, { backgroundColor: col }]} />
                              <Text style={[s.transferChipText, { color: col }]}>
                                {v.chauffeurNom.split(' ')[0]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 1 },
  saveBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  noteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF9E6',
    borderBottomWidth: 1,
    borderBottomColor: '#F5E8A0',
  },
  noteText: { fontSize: 11, color: '#8A7200', fontWeight: '500', flex: 1 },

  tabsScroll: { backgroundColor: colors.card, flexGrow: 0 },
  tabsContent: {
    paddingHorizontal: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabDot: { width: 8, height: 8, borderRadius: 4 },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  tabBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800' },

  vehicleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAF2EE',
  },
  vehicleBarText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  stopsList: { flex: 1, paddingTop: 8 },

  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAF2EE',
  },
  stopNum: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stopNumText: { fontSize: 11, fontWeight: '800' },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 13, fontWeight: '600', color: colors.text },
  stopMeta: { flexDirection: 'row', gap: 4, marginTop: 2 },
  stopMetaText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  stopActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#DDE8E3',
  },
  actionBtnDisabled: { opacity: 0.35 },
  actionBtnActive: {
    backgroundColor: '#E8F5EE',
    borderColor: colors.primaryLight + '60',
  },

  transferPicker: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FBFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE8E3',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  transferLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  transferOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  transferChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  transferDot: { width: 8, height: 8, borderRadius: 4 },
  transferChipText: { fontSize: 13, fontWeight: '700' },

  emptyTab: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTabText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
});
