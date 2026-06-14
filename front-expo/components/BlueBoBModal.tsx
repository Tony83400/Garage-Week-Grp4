import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import type { Arret } from '../services/chauffeur';

const BB = '#1A3FA8';
const BB_LIGHT = '#EEF3FF';
const BB_MID = '#C7D8FF';

// Données fictives réalistes pour la démo
const FAKE_STOPS: Record<number, { address: string; instruction: string }> = {};
function getFakeData(ordre: number) {
  const pool = [
    { address: '12 Rue des Mimosas\n83210 La Farlède', instruction: 'Portail vert sur le côté du bâtiment. Bacs alignés contre le mur de droite.' },
    { address: '4 Allée des Lavandes\n83130 La Garde', instruction: 'Entrée de service. Sonnez chez le gardien si portail fermé.' },
    { address: '27 Avenue du Soleil\n83000 Toulon', instruction: 'Bacs au fond de la cour intérieure, accès depuis la rue latérale.' },
    { address: '8 Chemin des Pins\n83160 La Valette-du-Var', instruction: 'Conteneur marron devant la grille principale, côté droit.' },
    { address: '15 Rue de la Méditerranée\n83200 Toulon', instruction: 'Accès libre. Bacs sous l\'auvent à gauche de l\'entrée.' },
  ];
  return pool[ordre % pool.length];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  stop: Arret | null;
  stopIndex: number;
  totalStops: number;
}

export default function BlueBoBModal({ visible, onClose, stop, stopIndex, totalStops }: Props) {
  if (!stop) return null;
  const fake = getFakeData(stop.ordre || 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* Header BlueBoB */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.logoBox}>
                <Text style={s.logoLetter}>B</Text>
              </View>
              <Text style={s.appName}>BlueBoB</Text>
              <View style={s.partnerBadge}>
                <Ionicons name="checkmark-circle" size={11} color={BB} />
                <Text style={s.partnerText}>Partenaire</Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Stop header */}
            <View style={s.stopHeader}>
              <Text style={s.stopNum}>Arrêt {stopIndex} · {totalStops} au total</Text>
              <Text style={s.stopName}>{stop.client_nom}</Text>
            </View>

            {/* Adresse */}
            <View style={s.infoRow}>
              <View style={s.infoIconBox}>
                <Ionicons name="location" size={16} color={BB} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Adresse</Text>
                <Text style={s.infoValue}>{fake.address}</Text>
              </View>
            </View>

            {/* Photo placeholder */}
            <Text style={s.sectionLabel}>Emplacement des bacs</Text>
            <View style={s.photoPlaceholder}>
              <View style={s.photoIconRow}>
                <Ionicons name="trash-outline" size={28} color="#94A3B8" />
                <Ionicons name="trash-outline" size={28} color="#94A3B8" />
                <Ionicons name="trash-outline" size={22} color="#B8C5D0" />
              </View>
              <Text style={s.photoCaption}>Photo terrain · version démo</Text>
            </View>

            {/* Instructions */}
            <Text style={s.sectionLabel}>Instructions</Text>
            <View style={s.instructionBox}>
              <Ionicons name="information-circle-outline" size={15} color={BB} style={{ marginTop: 1 }} />
              <Text style={s.instructionText}>{fake.instruction}</Text>
            </View>

            {/* Waze — stylé mais non fonctionnel en proto */}
            <View style={s.wazeRow}>
              <View style={s.wazeBtn}>
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={s.wazeBtnText}>Ouvrir dans Waze</Text>
              </View>
              <View style={s.wazeDemoTag}>
                <Text style={s.wazeDemoText}>démo</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity style={s.footerBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={s.footerBtnText}>Retour à la collecte</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F8FAFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
  },

  // Header
  header: {
    backgroundColor: BB,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: BB,
    letterSpacing: -0.5,
  },
  appName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BB_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  partnerText: {
    fontSize: 10,
    fontWeight: '700',
    color: BB,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 20, gap: 16 },

  stopHeader: {
    gap: 4,
    paddingBottom: 4,
  },
  stopNum: {
    fontSize: 11,
    fontWeight: '700',
    color: BB,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stopName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: BB_LIGHT,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BB_MID,
  },
  infoIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: BB,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 20,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -8,
  },

  photoPlaceholder: {
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  photoIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  photoCaption: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: BB_LIGHT,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BB_MID,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 20,
  },

  wazeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  wazeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00AAFF',
    borderRadius: 14,
    paddingVertical: 13,
  },
  wazeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  wazeDemoTag: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wazeDemoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFF',
  },
  footerBtn: {
    backgroundColor: BB,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
