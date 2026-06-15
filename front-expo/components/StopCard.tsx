import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

export type Stop = {
  id: number;
  ordre: number;
  nom: string;
  ville: string;
  poidsPrevu: number;
  type_imprevu?: string | null;
};

interface Props {
  stop: Stop;
  isFirst: boolean;
  onValidate: () => void;
  onSkip: () => void;
}

export default function StopCard({ stop, isFirst, onValidate, onSkip }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  // On détecte si l'arrêt provient d'une réassignation IA
  const isReassigned = stop.type_imprevu === 'integre_dynamiquement' || stop.type_imprevu === 'replanifie';

  function animate(direction: 1 | -1, callback: () => void) {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 270, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: direction * 140, duration: 270, useNativeDriver: true }),
    ]).start(() => callback());
  }

  return (
    <Animated.View style={[s.card, isReassigned && s.cardReassigned, { opacity, transform: [{ translateX }] }]}>
      <View style={s.row}>
        {isFirst ? (
          <LinearGradient
            colors={[colors.primaryLight, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.numCircle}
          >
            <Text style={s.numTextFirst}>{stop.ordre}</Text>
          </LinearGradient>
        ) : (
          <View style={s.numCircleMuted}>
            <Text style={s.numTextMuted}>{stop.ordre}</Text>
          </View>
        )}

        <View style={s.info}>
          {/* Couleur verte si réassigné */}
          <Text style={[s.name, isReassigned && { color: '#27AE60' }]} numberOfLines={1}>
            {stop.nom} {isReassigned ? '✨ (Réassigné)' : ''}
          </Text>
          <Text style={s.ville}>{stop.ville}</Text>
          <Text style={s.poids}>~{stop.poidsPrevu} kg prévus</Text>
        </View>

        <View style={s.actions}>
          <TouchableOpacity
            style={s.btnValidate}
            onPress={() => animate(1, onValidate)}
            activeOpacity={0.75}
          >
            <Ionicons name="checkmark" size={18} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btnSkip}
            onPress={() => animate(-1, onSkip)}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={18} color={colors.coral} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAF2EE',
    marginBottom: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardReassigned: {
    backgroundColor: '#E8F5EE',
    borderColor: '#2ECC71',
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  numCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  numCircleMuted: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F0EC',
    borderWidth: 1.5,
    borderColor: '#D4E8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numTextFirst: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  numTextMuted: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ville: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  poids: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: '600',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btnValidate: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E8D4',
  },
  btnSkip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.coralLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.2)',
  },
});