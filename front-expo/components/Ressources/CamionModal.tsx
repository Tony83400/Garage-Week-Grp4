import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { RessourcesService } from '../../services/ressources';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function CamionModal({ visible, onClose, onSuccess }: Props) {
  const [immat, setImmat] = useState('');
  const [charge, setCharge] = useState('');
  const [bacs, setBacs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!immat || !charge || !bacs) {
      setError('Tous les champs sont requis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await RessourcesService.addCamion({
        immatriculation: immat,
        charge_max_kg: parseInt(charge, 10),
        bacs_max: parseInt(bacs, 10)
      });
      onSuccess(`Camion ${immat} ajouté.`);
      onClose();
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'ajout du camion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.header}>
            <Text style={s.title}>Ajouter un camion</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {error && <Text style={s.error}>{error}</Text>}

          <View style={s.form}>
            <Text style={s.label}>Immatriculation</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: AB-123-CD"
              value={immat}
              onChangeText={setImmat}
            />

            <Text style={s.label}>Charge maximale (kg)</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: 1500"
              keyboardType="numeric"
              value={charge}
              onChangeText={setCharge}
            />

            <Text style={s.label}>Capacité en bacs</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: 20"
              keyboardType="numeric"
              value={bacs}
              onChangeText={setBacs}
            />
          </View>

          <View style={s.footer}>
            <TouchableOpacity style={s.btnCancel} onPress={onClose}>
              <Text style={s.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSave} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.btnSaveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  error: { color: colors.error, marginBottom: 12, fontSize: 13 },
  form: { gap: 12, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: '#F7F9F8', borderWidth: 1, borderColor: '#E8F0EC',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: colors.text,
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