import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { RessourcesService } from '../../services/ressources';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function ChauffeurModal({ visible, onClose, onSuccess }: Props) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telephone, setTelephone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!nom || !prenom || !email || !password) {
      setError('Nom, prénom, email et mot de passe sont requis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await RessourcesService.addChauffeur({
        nom, prenom, email, mot_de_passe: password, telephone
      });
      onSuccess(`Chauffeur ${prenom} ${nom} ajouté.`);
      onClose();
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'ajout du chauffeur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.header}>
            <Text style={s.title}>Ajouter un chauffeur</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {error && <Text style={s.error}>{error}</Text>}

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            <View style={s.form}>
              <Text style={s.label}>Prénom</Text>
              <TextInput style={s.input} placeholder="Ex: Jean" value={prenom} onChangeText={setPrenom} />

              <Text style={s.label}>Nom</Text>
              <TextInput style={s.input} placeholder="Ex: Dupont" value={nom} onChangeText={setNom} />

              <Text style={s.label}>Téléphone</Text>
              <TextInput style={s.input} placeholder="Ex: 0600000000" keyboardType="phone-pad" value={telephone} onChangeText={setTelephone} />

              <View style={s.divider} />

              <Text style={s.label}>Email de connexion</Text>
              <TextInput style={s.input} placeholder="Ex: jean@logistique.fr" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

              <Text style={s.label}>Mot de passe</Text>
              <TextInput style={s.input} placeholder="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
            </View>
          </ScrollView>

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
    padding: 24, maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  error: { color: colors.error, marginBottom: 12, fontSize: 13 },
  scroll: { flexShrink: 1, marginBottom: 20 },
  form: { gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: '#F7F9F8', borderWidth: 1, borderColor: '#E8F0EC',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  divider: { height: 1, backgroundColor: '#E8F0EC', marginVertical: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btnCancel: { paddingHorizontal: 16, paddingVertical: 12 },
  btnCancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  btnSave: {
    backgroundColor: colors.primaryLight, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, minWidth: 100, alignItems: 'center',
  },
  btnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});