import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { addClient } from '@/services/clients';

const CATEGORIES = ['Restaurant', 'Hôtel', 'École', 'Cantine', 'Fast-food', 'Supermarché', 'Autre'];
const VILLES = ['Toulon', 'Hyères', 'La Seyne-sur-Mer', 'Six-Fours', 'Sanary-sur-Mer', 'Bandol', 'Ollioules', 'La Garde', 'Le Pradet', 'Le Lavandou'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function SiteModal({ visible, onClose, onSuccess }: Props) {
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('');
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [slotStart, setSlotStart] = useState('07:00');
  const [slotEnd, setSlotEnd] = useState('12:00');
  const [saisonnier, setSaisonnier] = useState(false);

  const canSubmit = nom.trim().length > 0 && adresse.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    
    try {
      // Appel à l'API Python pour enregistrer le client
      await addClient({
        nom_entreprise: nom.trim(),
        // On met des coordonnées bidons pour la démo, 
        // ou on pourrait utiliser l'adresse pour faire du géocodage plus tard
        latitude: 43.1200, 
        longitude: 5.9300 
      });

      onSuccess(`✓ ${nom.trim()} ajouté avec succès !`);
      handleClose(); // Ferme et vide le formulaire
    } catch (e: any) {
      console.error(e);
      // Gérer l'erreur si besoin
      alert("Erreur lors de l'ajout du site");
    }
  }

  function handleClose() {
    setNom('');
    setCategorie('');
    setAdresse('');
    setVille('');
    setSlotStart('07:00');
    setSlotEnd('12:00');
    setSaisonnier(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <View style={s.sheet}>
            {/* Handle */}
            <View style={s.handle} />

            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.title}>Nouveau site de collecte</Text>
                <Text style={s.subtitle}>Ajouter un point au planning</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.75}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView
              style={s.form}
              contentContainerStyle={s.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Nom */}
              <View style={s.field}>
                <Text style={s.label}>Nom de l'établissement <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={s.input}
                  value={nom}
                  onChangeText={setNom}
                  placeholder="ex: McDonald's Toulon Mayol"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Catégorie */}
              <View style={s.field}>
                <Text style={s.label}>Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.chip, categorie === cat && s.chipActive]}
                      onPress={() => setCategorie(cat)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.chipText, categorie === cat && s.chipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Adresse */}
              <View style={s.field}>
                <Text style={s.label}>Adresse <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={s.input}
                  value={adresse}
                  onChangeText={setAdresse}
                  placeholder="ex: 12 rue des Oliviers"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Ville */}
              <View style={s.field}>
                <Text style={s.label}>Commune</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  {VILLES.map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[s.chip, ville === v && s.chipActive]}
                      onPress={() => setVille(v)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.chipText, ville === v && s.chipTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Créneau */}
              <View style={s.field}>
                <Text style={s.label}>Créneau de collecte</Text>
                <View style={s.timeRow}>
                  <View style={s.timeField}>
                    <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                    <TextInput
                      style={s.timeInput}
                      value={slotStart}
                      onChangeText={setSlotStart}
                      placeholder="07:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <Text style={s.timeSep}>→</Text>
                  <View style={s.timeField}>
                    <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                    <TextInput
                      style={s.timeInput}
                      value={slotEnd}
                      onChangeText={setSlotEnd}
                      placeholder="12:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Saisonnalité */}
              <TouchableOpacity
                style={[s.saisonCard, saisonnier && s.saisonCardActive]}
                onPress={() => setSaisonnier(v => !v)}
                activeOpacity={0.8}
              >
                <View style={[s.saisonIconWrap, saisonnier && s.saisonIconWrapActive]}>
                  <Ionicons
                    name={saisonnier ? 'sunny' : 'sunny-outline'}
                    size={20}
                    color={saisonnier ? '#E67E22' : colors.textMuted}
                  />
                </View>
                <View style={s.saisonInfo}>
                  <Text style={[s.saisonTitle, saisonnier && s.saisonTitleActive]}>
                    Saisonnalité {saisonnier ? 'active' : 'inactive'}
                  </Text>
                  <Text style={s.saisonSub}>Juin → Septembre · prédiction +20%</Text>
                </View>
                <View style={[s.toggle, saisonnier && s.toggleActive]}>
                  <View style={[s.toggleThumb, saisonnier && s.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer */}
            <View style={s.footer}>
              <TouchableOpacity style={s.btnCancel} onPress={handleClose} activeOpacity={0.8}>
                <Text style={s.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSubmit, !canSubmit && s.btnSubmitDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={!canSubmit}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.btnSubmitText}>Valider le site</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4E8DC',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    flexGrow: 0,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: colors.coral,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E8DC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#D4E8DC',
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E8DC',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  timeInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  timeSep: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '600',
  },
  saisonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#D4E8DC',
  },
  saisonCardActive: {
    backgroundColor: '#FFF8F0',
    borderColor: 'rgba(230,126,34,0.3)',
  },
  saisonIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#EAF2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saisonIconWrapActive: {
    backgroundColor: '#FFF0DC',
  },
  saisonInfo: {
    flex: 1,
  },
  saisonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  saisonTitleActive: {
    color: '#E67E22',
  },
  saisonSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D4E8DC',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#E67E22',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    marginLeft: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#EAF2EE',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  btnSubmit: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnSubmitDisabled: {
    backgroundColor: '#A8C5B5',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
