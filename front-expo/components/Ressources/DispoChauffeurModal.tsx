import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { RessourcesService, Chauffeur, DisponibiliteChauffeur } from '../../services/ressources';

// We only import the DateTimePicker conditionally or handle web differently.
// For simplicity in a cross-platform Expo app without complex native linking setups,
// let's use a simpler native HTML5 time input for Web and the modal for Native,
// OR just a safe cross-platform fallback since react-native-modal-datetime-picker can have web issues.
let DateTimePickerModal: any;
if (Platform.OS !== 'web') {
  DateTimePickerModal = require('react-native-modal-datetime-picker').default;
}

interface Props {
  visible: boolean;
  chauffeur: Chauffeur;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const JOURS = [
  { id: 1, label: 'Lundi' },
  { id: 2, label: 'Mardi' },
  { id: 3, label: 'Mercredi' },
  { id: 4, label: 'Jeudi' },
  { id: 5, label: 'Vendredi' },
  { id: 6, label: 'Samedi' },
  { id: 7, label: 'Dimanche' },
];

export default function DispoChauffeurModal({ visible, chauffeur, onClose, onSuccess }: Props) {
  const [dispos, setDispos] = useState<DisponibiliteChauffeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState<{ dayId: number; type: 'debut' | 'fin' } | null>(null);

  useEffect(() => {
    async function loadDispos() {
      try {
        const data = await RessourcesService.getDisponibilites(chauffeur.id);
        setDispos(data);
      } catch (e) {
        console.warn('Error fetching dispos:', e);
      } finally {
        setLoading(false);
      }
    }
    if (visible) loadDispos();
  }, [visible, chauffeur.id]);

  async function handleSave() {
    setSaving(true);
    try {
      await RessourcesService.updateDisponibilites(chauffeur.id, dispos);
      onSuccess(`Disponibilités de ${chauffeur.prenom} mises à jour.`);
      onClose();
    } catch (e) {
      console.warn('Error saving dispos:', e);
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(dayId: number) {
    if (dispos.find(d => d.jour_semaine === dayId)) {
      setDispos(dispos.filter(d => d.jour_semaine !== dayId));
    } else {
      setDispos([...dispos, { jour_semaine: dayId, heure_debut: '08:00:00', heure_fin: '16:00:00' }]);
    }
  }

  function openPicker(dayId: number, type: 'debut' | 'fin') {
    if (Platform.OS === 'web') {
      // Pour le Web, on utilise une simple boîte de dialogue JS native pour aller vite
      // (Alternativement on pourrait rendre un <input type="time">, mais prompt() est un hack rapide cross-platform)
      const currentDispo = dispos.find(d => d.jour_semaine === dayId);
      const currentTime = currentDispo ? (type === 'debut' ? currentDispo.heure_debut : currentDispo.heure_fin) : '08:00:00';
      const result = window.prompt(`Nouvelle heure (HH:MM) pour le ${type} :`, currentTime.substring(0, 5));
      
      if (result && /^([01]\d|2[0-3]):([0-5]\d)$/.test(result)) {
        updateTime(dayId, type, `${result}:00`);
      } else if (result) {
        alert("Format invalide. Utilisez HH:MM (ex: 08:30)");
      }
    } else {
      setActivePicker({ dayId, type });
      setDatePickerVisible(true);
    }
  }

  function updateTime(dayId: number, type: 'debut' | 'fin', timeString: string) {
    setDispos(prev => prev.map(d => {
      if (d.jour_semaine === dayId) {
        return type === 'debut' ? { ...d, heure_debut: timeString } : { ...d, heure_fin: timeString };
      }
      return d;
    }));
  }

  function handleConfirmTime(date: Date) {
    if (!activePicker) return;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeString = `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
    
    updateTime(activePicker.dayId, activePicker.type, timeString);
    
    setDatePickerVisible(false);
    setActivePicker(null);
  }

  function formatTime(t: string) {
    if (!t) return '00:00';
    return t.substring(0, 5); // "HH:MM"
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.header}>
            <Text style={s.title}>Horaires de {chauffeur.prenom}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
             <ActivityIndicator size="large" color={colors.primaryLight} style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
              {JOURS.map(jour => {
                const dispo = dispos.find(d => d.jour_semaine === jour.id);
                const isActive = !!dispo;

                return (
                  <View key={jour.id} style={[s.dayRow, isActive && s.dayRowActive]}>
                    <TouchableOpacity style={s.dayToggle} onPress={() => toggleDay(jour.id)}>
                      <Ionicons 
                        name={isActive ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={isActive ? colors.primaryLight : colors.textMuted} 
                      />
                      <Text style={[s.dayLabel, isActive && s.dayLabelActive]}>{jour.label}</Text>
                    </TouchableOpacity>

                    {isActive && dispo && (
                      <View style={s.timeControls}>
                        <TouchableOpacity style={s.timeBtn} onPress={() => openPicker(jour.id, 'debut')}>
                          <Text style={s.timeText}>{formatTime(dispo.heure_debut)}</Text>
                        </TouchableOpacity>
                        <Text style={s.timeSep}>-</Text>
                        <TouchableOpacity style={s.timeBtn} onPress={() => openPicker(jour.id, 'fin')}>
                          <Text style={s.timeText}>{formatTime(dispo.heure_fin)}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={s.footer}>
            <TouchableOpacity style={s.btnCancel} onPress={onClose}>
              <Text style={s.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSave} onPress={handleSave} disabled={saving || loading}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.btnSaveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {Platform.OS !== 'web' && DateTimePickerModal && (
        <DateTimePickerModal
          isVisible={datePickerVisible}
          mode="time"
          onConfirm={handleConfirmTime}
          onCancel={() => setDatePickerVisible(false)}
        />
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 400,
    padding: 24, maxHeight: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  scroll: { flexShrink: 1, marginBottom: 20 },
  
  dayRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F4F2',
  },
  dayRowActive: {
    backgroundColor: 'rgba(82, 183, 136, 0.05)',
    borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8,
  },
  dayToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1,
  },
  dayLabel: {
    fontSize: 15, fontWeight: '500', color: colors.textMuted,
  },
  dayLabelActive: {
    color: colors.text, fontWeight: '600',
  },
  timeControls: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  timeBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#D8E2DC',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  timeText: {
    fontSize: 14, fontWeight: '600', color: colors.primaryLight,
  },
  timeSep: {
    fontSize: 14, color: colors.textMuted, fontWeight: '600',
  },

  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btnCancel: { paddingHorizontal: 16, paddingVertical: 12 },
  btnCancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  btnSave: {
    backgroundColor: colors.primaryLight, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, minWidth: 100, alignItems: 'center',
  },
  btnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});