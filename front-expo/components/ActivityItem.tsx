import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

interface Props {
  type: 'success' | 'error';
  name: string;
  detail: string;
  time: string;
}

export default function ActivityItem({ type, name, detail, time }: Props) {
  return (
    <View style={styles.item}>
      <View style={[styles.iconBox, type === 'success' ? styles.iconSuccess : styles.iconError]}>
        {type === 'success'
          ? <Ionicons name="checkmark-circle-outline" size={16} color={colors.primaryLight} />
          : <Ionicons name="close-circle-outline" size={16} color={colors.coral} />
        }
      </View>
      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconSuccess: { backgroundColor: '#E8F5EE' },
  iconError: { backgroundColor: colors.coralLight },
  text: { flex: 1 },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  detail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
