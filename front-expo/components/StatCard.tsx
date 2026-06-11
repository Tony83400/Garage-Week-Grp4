import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

type BadgeStyle = 'ok' | 'warn' | 'info';

interface Props {
  iconBg: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  badgeText: string;
  badgeStyle: BadgeStyle;
}

const badgeColors: Record<BadgeStyle, { bg: string; text: string }> = {
  ok:   { bg: '#E8F5EE', text: colors.primaryLight },
  warn: { bg: colors.coralLight, text: colors.coral },
  info: { bg: '#E6F4FA', text: colors.secondary },
};

export default function StatCard({ iconBg, icon, value, label, badgeText, badgeStyle }: Props) {
  const badge = badgeColors[badgeStyle];
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.text }]}>{badgeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EAF2EE',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badge: {
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
