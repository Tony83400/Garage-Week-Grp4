import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { type Client, type Disponibilite, getClientDisponibilites, deleteClient } from '../services/clients';

const JOUR_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getContractStatus(fin?: string): { label: string; color: string; bg: string; border: string } {
  if (!fin) return { label: 'Sans contrat', color: colors.textMuted, bg: '#F0F4F2', border: '#D4E0DC' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(fin);
  const diffDays = Math.floor((endDate.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: 'Expiré', color: colors.coral, bg: colors.coralLight, border: 'rgba(231,111,81,0.3)' };
  if (diffDays <= 30) return { label: `Expire dans ${diffDays}j`, color: '#C8960C', bg: '#FFF8E8', border: 'rgba(200,150,12,0.3)' };
  return { label: 'Actif', color: colors.primaryLight, bg: '#E8F5EE', border: '#C8E8D4' };
}

interface Props {
  visible: boolean;
  client: Client | null;
  onClose: () => void;
  onDeleted: (id: number) => void;
  onToast: (msg: string) => void;
}

export default function SiteDetailModal({ visible, client, onClose, onDeleted, onToast }: Props) {
  const [dispos, setDispos] = useState<Disponibilite[]>([]);
  const [loadingDispos, setLoadingDispos] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!visible || !client?.id) {
      setDispos([]);
      setDeleteConfirm(false);
      return;
    }
    setLoadingDispos(true);
    getClientDisponibilites(client.id)
      .then(setDispos)
      .catch(() => setDispos([]))
      .finally(() => setLoadingDispos(false));
  }, [visible, client?.id]);

  async function handleDelete() {
    if (!client?.id) return;
    setDeleting(true);
    try {
      await deleteClient(client.id);
      onDeleted(client.id);
      onToast('Site supprimé');
      onClose();
    } catch {
      onToast('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  if (!client) return null;

  const contractStatus = getContractStatus(client.date_fin_contrat);
  const joursActifs = [...new Set(dispos.map(d => d.jour_semaine))].sort();
  const creneauUnique = dispos.length > 0
    ? `${dispos[0].heure_debut.slice(0, 5)} — ${dispos[0].heure_fin.slice(0, 5)}`
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header vert foncé */}
          <View style={s.header}>
            <View style={s.headerIconWrap}>
              <Ionicons name="leaf" size={16} color="#A8D5B8" />
            </View>
            <View style={s.headerText}>
              <Text style={s.headerName} numberOfLines={2}>{client.nom_entreprise}</Text>
              {client.adresse ? (
                <Text style={s.headerAddr} numberOfLines={1}>{client.adresse}</Text>
              ) : null}
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Contrat */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="document-text-outline" size={13} color={colors.primaryLight} />
                <Text style={s.sectionLabel}>Contrat</Text>
                <View style={[s.statusBadge, { backgroundColor: contractStatus.bg, borderColor: contractStatus.border }]}>
                  <Text style={[s.statusBadgeText, { color: contractStatus.color }]}>{contractStatus.label}</Text>
                </View>
              </View>

              {client.date_debut_contrat || client.date_fin_contrat ? (
                <View style={s.dateRange}>
                  <View style={s.dateBox}>
                    <Text style={s.dateBoxLabel}>Début</Text>
                    <Text style={s.dateBoxValue}>{formatDate(client.date_debut_contrat)}</Text>
                  </View>
                  <View style={s.dateSeparator}>
                    <View style={s.dateLine} />
                    <Ionicons name="arrow-forward-outline" size={12} color={colors.textMuted} />
                    <View style={s.dateLine} />
                  </View>
                  <View style={s.dateBox}>
                    <Text style={s.dateBoxLabel}>Fin</Text>
                    <Text style={[s.dateBoxValue, client.date_fin_contrat && getContractStatus(client.date_fin_contrat).color !== colors.primaryLight
                      ? { color: getContractStatus(client.date_fin_contrat).color }
                      : {}
                    ]}>{formatDate(client.date_fin_contrat)}</Text>
                  </View>
                </View>
              ) : (
                <Text style={s.noData}>Aucune date de contrat enregistrée</Text>
              )}
            </View>

            <View style={s.divider} />

            {/* Jours et créneaux */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="calendar-outline" size={13} color={colors.primaryLight} />
                <Text style={s.sectionLabel}>Planning de collecte</Text>
              </View>

              {loadingDispos ? (
                <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginTop: 8 }} />
              ) : joursActifs.length > 0 ? (
                <>
                  <View style={s.joursRow}>
                    {[1, 2, 3, 4, 5].map(j => (
                      <View
                        key={j}
                        style={[s.jourChip, joursActifs.includes(j) && s.jourChipActive]}
                      >
                        <Text style={[s.jourChipText, joursActifs.includes(j) && s.jourChipTextActive]}>
                          {JOUR_LABELS[j]}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {creneauUnique && (
                    <View style={s.creneauRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={s.creneauText}>{creneauUnique}</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={s.noData}>Aucun créneau de collecte défini</Text>
              )}
            </View>

            <View style={s.divider} />

            {/* Coordonnées */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="navigate-outline" size={13} color={colors.primaryLight} />
                <Text style={s.sectionLabel}>Coordonnées GPS</Text>
              </View>
              <Text style={s.coordText}>
                {client.latitude.toFixed(5)}, {client.longitude.toFixed(5)}
              </Text>
            </View>

            {/* Renouveler le contrat */}
            <TouchableOpacity
              style={s.renewBtn}
              activeOpacity={0.85}
              onPress={() => onToast('Renouvellement — fonctionnalité disponible prochainement')}
            >
              <Ionicons name="refresh-outline" size={16} color="#C8960C" />
              <Text style={s.renewBtnText}>Renouveler le contrat</Text>
            </TouchableOpacity>

            {/* Supprimer */}
            <View style={s.deleteZone}>
              {deleteConfirm ? (
                <View style={s.deleteConfirmBlock}>
                  <Text style={s.deleteConfirmText}>Supprimer définitivement ce site ?</Text>
                  <View style={s.deleteConfirmBtns}>
                    <TouchableOpacity
                      style={s.deleteCancelBtn}
                      onPress={() => setDeleteConfirm(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.deleteCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.deleteConfirmBtn}
                      onPress={handleDelete}
                      activeOpacity={0.8}
                      disabled={deleting}
                    >
                      {deleting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.deleteConfirmBtnText}>Oui, supprimer</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.deleteLink}
                  onPress={() => setDeleteConfirm(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={13} color={colors.coral} />
                  <Text style={s.deleteLinkText}>Supprimer ce site</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D4E8DC',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 0,
  },

  // Header vert foncé
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 8,
  },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerAddr: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2, fontWeight: '500' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 0 },

  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    color: colors.primaryLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
    flex: 1,
  },

  statusBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  // Date range
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0EDE6',
    padding: 16,
    gap: 8,
  },
  dateBox: { flex: 1, alignItems: 'center', gap: 4 },
  dateBoxLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateBoxValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateLine: { width: 12, height: 1, backgroundColor: '#C8D8D0' },

  noData: { fontSize: 13, color: colors.textMuted, fontWeight: '500', fontStyle: 'italic' },

  divider: { height: 1, backgroundColor: '#EAF2EE', marginVertical: 16 },

  // Jours
  joursRow: { flexDirection: 'row', gap: 6 },
  jourChip: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: '#D4E8DC',
    alignItems: 'center',
  },
  jourChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  jourChipText: { fontSize: 12, fontWeight: '700', color: '#B0C8BC' },
  jourChipTextActive: { color: '#fff' },

  creneauRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0F7F4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#D4E8DC',
    alignSelf: 'flex-start',
  },
  creneauText: { fontSize: 13, fontWeight: '700', color: colors.text },

  coordText: { fontSize: 12, color: colors.textMuted, fontWeight: '500', fontFamily: 'monospace' },

  // Renouveler
  renewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 4,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FFF8E8',
    borderWidth: 1.5, borderColor: 'rgba(200,150,12,0.35)',
  },
  renewBtnText: { fontSize: 14, fontWeight: '700', color: '#C8960C' },

  // Delete zone
  deleteZone: { marginTop: 20, alignItems: 'center' },
  deleteLink: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  deleteLinkText: { fontSize: 13, fontWeight: '600', color: colors.coral },

  deleteConfirmBlock: {
    width: '100%', backgroundColor: colors.coralLight,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.25)',
    padding: 16, gap: 12,
  },
  deleteConfirmText: { fontSize: 13, fontWeight: '700', color: colors.coral, textAlign: 'center' },
  deleteConfirmBtns: { flexDirection: 'row', gap: 10 },
  deleteCancelBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D4E8DC',
    alignItems: 'center',
  },
  deleteCancelText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  deleteConfirmBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: colors.coral, alignItems: 'center',
  },
  deleteConfirmBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
