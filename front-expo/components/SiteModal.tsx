import React, { useState, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { addClient, addDisponibilite } from '@/services/clients';

const CATEGORIES = ['Restaurant', 'Hôtel', 'École', 'Cantine', 'Fast-food', 'Supermarché', 'Autre'];
const VILLES = ['Toulon', 'Hyères', 'La Seyne-sur-Mer', 'Six-Fours', 'Sanary-sur-Mer', 'Bandol', 'Ollioules', 'La Garde', 'Le Pradet', 'Le Lavandou'];
const DUREES_CONTRAT = [
  { label: '6 mois', months: 6 },
  { label: '1 an', months: 12 },
  { label: '2 ans', months: 24 },
];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDateFR(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const JOURS = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
];

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
  const [joursSelected, setJoursSelected] = useState<number[]>([]);
  const [saisonnier, setSaisonnier] = useState(false);

  function toggleJour(val: number) {
    setJoursSelected(prev =>
      prev.includes(val) ? prev.filter(j => j !== val) : [...prev, val]
    );
  }
  const [contractMonths, setContractMonths] = useState<number | null>(12);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLon, setGeoLon] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSubmit = nom.trim().length > 0 && geoLat !== null && geoLon !== null;

  function handleAdresseChange(text: string) {
    setAdresse(text);
    setGeoLat(null);
    setGeoLon(null);
    setSuggestions([]);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 3) return;
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const q = encodeURIComponent(text + ' Var France');
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=fr`;
        const res = await fetch(url, { headers: { 'User-Agent': 'AlchiRoute/1.0 contact@les-alchimistes.fr' } });
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  }

  function handleSelectSuggestion(item: NominatimResult) {
    setAdresse(item.display_name);
    setGeoLat(parseFloat(item.lat));
    setGeoLon(parseFloat(item.lon));
    setSuggestions([]);
    setFocusedField(null);
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const today = new Date();
      const dateDebut = toISODate(today);
      const dateFin = contractMonths ? toISODate(addMonths(today, contractMonths)) : undefined;

      const result = await addClient({
        nom_entreprise: nom.trim(),
        latitude: geoLat!,
        longitude: geoLon!,
        adresse: adresse.trim(),
        date_debut_contrat: dateDebut,
        date_fin_contrat: dateFin,
      });
      if (result.id && joursSelected.length > 0) {
        const hd = slotStart.length === 5 ? slotStart + ':00' : slotStart;
        const hf = slotEnd.length === 5 ? slotEnd + ':00' : slotEnd;
        for (const jour of joursSelected) {
          await addDisponibilite({ client_id: result.id!, jour_semaine: jour, heure_debut: hd, heure_fin: hf });
        }
      }
      onSuccess(`✓ ${nom.trim()} ajouté avec succès !`);
      handleClose();
    } catch {
      setErrorMsg("Impossible d'ajouter ce site. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setNom('');
    setCategorie('');
    setAdresse('');
    setVille('');
    setSlotStart('07:00');
    setSlotEnd('12:00');
    setSaisonnier(false);
    setContractMonths(12);
    setErrorMsg(null);
    setFocusedField(null);
    setSuggestions([]);
    setGeoLat(null);
    setGeoLon(null);
    setJoursSelected([]);
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
              <View style={s.headerIconWrap}>
                <Ionicons name="leaf" size={18} color={colors.primaryLight} />
              </View>
              <View style={s.headerText}>
                <Text style={s.title}>Nouveau site de collecte</Text>
                <Text style={s.subtitle}>Var · Les Alchimistes Côte d'Azur</Text>
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
              {/* Section — Établissement */}
              <View style={s.sectionHeader}>
                <Ionicons name="business-outline" size={13} color={colors.primaryLight} />
                <Text style={s.sectionLabel}>Établissement</Text>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Nom <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={[s.input, focusedField === 'nom' && s.inputFocused]}
                  value={nom}
                  onChangeText={setNom}
                  onFocus={() => setFocusedField('nom')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="ex: McDonald's Toulon Mayol"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.chip, categorie === cat && s.chipActive]}
                      onPress={() => setCategorie(c => c === cat ? '' : cat)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.chipText, categorie === cat && s.chipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={s.divider} />

              {/* Section — Localisation */}
              <View style={s.sectionHeader}>
                <Ionicons name="location-outline" size={13} color={colors.primaryLight} />
                <Text style={s.sectionLabel}>Localisation</Text>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Recherche du lieu <Text style={s.required}>*</Text></Text>
                <View style={[s.searchWrap, focusedField === 'adresse' && s.searchWrapFocused]}>
                  <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                  <TextInput
                    style={s.searchInput}
                    value={adresse}
                    onChangeText={handleAdresseChange}
                    onFocus={() => setFocusedField('adresse')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ex : McDonald's Toulon, École La Garde…"
                    placeholderTextColor={colors.textMuted}
                  />
                  {searchLoading && <ActivityIndicator size="small" color={colors.primaryLight} />}
                </View>

                {suggestions.length > 0 && (
                  <View style={s.suggestionsBox}>
                    {suggestions.map((item, i) => (
                      <TouchableOpacity
                        key={item.place_id}
                        style={[s.suggestionItem, i > 0 && s.suggestionDivider]}
                        onPress={() => handleSelectSuggestion(item)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="location-outline" size={13} color={colors.primaryLight} style={{ marginTop: 1, flexShrink: 0 }} />
                        <Text style={s.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {geoLat !== null && (
                  <View style={s.geoConfirm}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                    <Text style={s.geoConfirmText}>Lieu localisé — coordonnées récupérées</Text>
                  </View>
                )}
              </View>

              <View style={s.field}>
                <Text style={s.label}>Commune</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  {VILLES.map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[s.chip, ville === v && s.chipActive]}
                      onPress={() => setVille(c => c === v ? '' : v)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.chipText, ville === v && s.chipTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={s.divider} />

              {/* Section — Planning */}
              <View style={s.sectionHeader}>
                <Ionicons name="time-outline" size={13} color={colors.primaryLight} />
                <Text style={s.sectionLabel}>Planning</Text>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Jours de collecte</Text>
                <View style={s.joursRow}>
                  {JOURS.map(j => (
                    <TouchableOpacity
                      key={j.value}
                      style={[s.jourChip, joursSelected.includes(j.value) && s.jourChipActive]}
                      onPress={() => toggleJour(j.value)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.jourChipText, joursSelected.includes(j.value) && s.jourChipTextActive]}>
                        {j.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Créneau de collecte</Text>
                <View style={s.timeRow}>
                  <View style={[s.timeField, focusedField === 'start' && s.timeFieldFocused]}>
                    <Ionicons name="sunny-outline" size={14} color={colors.textMuted} />
                    <TextInput
                      style={s.timeInput}
                      value={slotStart}
                      onChangeText={setSlotStart}
                      onFocus={() => setFocusedField('start')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="07:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
                  <View style={[s.timeField, focusedField === 'end' && s.timeFieldFocused]}>
                    <Ionicons name="moon-outline" size={14} color={colors.textMuted} />
                    <TextInput
                      style={s.timeInput}
                      value={slotEnd}
                      onChangeText={setSlotEnd}
                      onFocus={() => setFocusedField('end')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="12:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

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
                    {saisonnier ? 'Saisonnalité active' : 'Client toute l\'année'}
                  </Text>
                  <Text style={s.saisonSub}>
                    {saisonnier ? 'Juin → Septembre · prédiction +20%' : 'Collecte régulière hors saison'}
                  </Text>
                </View>
                <View style={[s.toggle, saisonnier && s.toggleActive]}>
                  <View style={[s.toggleThumb, saisonnier && s.toggleThumbOn]} />
                </View>
              </TouchableOpacity>

              <View style={s.divider} />

              {/* Section — Contrat */}
              <View style={s.sectionHeader}>
                <Ionicons name="document-text-outline" size={13} color={colors.primaryLight} />
                <Text style={s.sectionLabel}>Contrat</Text>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Durée du contrat</Text>
                <View style={s.dureeRow}>
                  {DUREES_CONTRAT.map(d => (
                    <TouchableOpacity
                      key={d.months}
                      style={[s.dureeChip, contractMonths === d.months && s.dureeChipActive]}
                      onPress={() => setContractMonths(m => m === d.months ? null : d.months)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.dureeChipText, contractMonths === d.months && s.dureeChipTextActive]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {contractMonths !== null && (() => {
                  const today = new Date();
                  const debut = toISODate(today);
                  const fin = toISODate(addMonths(today, contractMonths));
                  return (
                    <View style={s.contractPreview}>
                      <Ionicons name="calendar-outline" size={12} color={colors.primaryLight} />
                      <Text style={s.contractPreviewText}>
                        Du {formatDateFR(debut)} au {formatDateFR(fin)}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* Inline error */}
              {errorMsg && (
                <View style={s.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.coral} />
                  <Text style={s.errorText}>{errorMsg}</Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={s.footer}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={handleClose}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <Text style={s.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSubmit, !canSubmit && s.btnSubmitDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={s.btnSubmitText}>Valider le site</Text>
                  </>
                )}
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
    flex: 1,
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
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2EE',
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E8D4',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
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
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 14,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAF2EE',
    marginVertical: 6,
  },

  // Fields
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.coral,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: colors.primaryLight,
    backgroundColor: '#F5FAF7',
  },

  // Search autocomplete
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchWrapFocused: {
    borderColor: colors.primaryLight,
    backgroundColor: '#F5FAF7',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  suggestionsBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E8DC',
    overflow: 'hidden',
    marginTop: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  suggestionDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EAF2EE',
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  geoConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  geoConfirmText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },

  // Jours chips
  joursRow: {
    flexDirection: 'row',
    gap: 8,
  },
  jourChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    alignItems: 'center',
  },
  jourChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  jourChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  jourChipTextActive: {
    color: '#fff',
  },

  // Chips
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1.5,
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

  // Time row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  timeFieldFocused: {
    borderColor: colors.primaryLight,
    backgroundColor: '#F5FAF7',
  },
  timeInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },

  // Saisonnalité
  saisonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
  },
  saisonCardActive: {
    backgroundColor: '#FFF8F0',
    borderColor: 'rgba(230,126,34,0.35)',
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

  // Contract duration chips
  dureeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dureeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    alignItems: 'center',
  },
  dureeChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  dureeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dureeChipTextActive: {
    color: '#fff',
  },
  contractPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  contractPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.coralLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.25)',
  },
  errorText: {
    fontSize: 12,
    color: colors.coral,
    fontWeight: '600',
    flex: 1,
  },

  // Footer
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
