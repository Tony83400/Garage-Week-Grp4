import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../constants/colors';

type BadgeStyle = 'ok' | 'warn' | 'info';

interface Props {
  iconBg: string;
  icon: React.ReactNode;
  value: string;
  numericValue?: number;
  valueSuffix?: string;
  label: string;
  badgeText: string;
  badgeStyle: BadgeStyle;
  animDelay?: number;
}

const badgeColors: Record<BadgeStyle, { bg: string; text: string }> = {
  ok:   { bg: '#E8F5EE', text: colors.primaryLight },
  warn: { bg: colors.coralLight, text: colors.coral },
  info: { bg: '#E6F4FA', text: colors.secondary },
};

export default function StatCard({
  iconBg, icon, value, numericValue, valueSuffix = '',
  label, badgeText, badgeStyle, animDelay = 0,
}: Props) {
  const badge = badgeColors[badgeStyle];
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [countDisplay, setCountDisplay] = useState('0');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 380, delay: animDelay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, delay: animDelay, useNativeDriver: true }),
    ]).start();

    if (numericValue !== undefined) {
      countAnim.setValue(0);
      Animated.timing(countAnim, {
        toValue: numericValue,
        duration: 700,
        delay: animDelay + 80,
        useNativeDriver: false,
      }).start();
      const listenerId = countAnim.addListener(({ value: v }) => {
        setCountDisplay(Math.round(v).toLocaleString('fr-FR'));
      });
      return () => countAnim.removeListener(listenerId);
    }
  }, [numericValue]);

  const displayedValue = numericValue !== undefined
    ? `${countDisplay}${valueSuffix}`
    : value;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {displayedValue}
      </Text>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.text }]}>{badgeText}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    gap: 8,
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
    fontSize: 20,
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
