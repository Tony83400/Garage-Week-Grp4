import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../constants/colors';

interface Props {
  type: 'success' | 'error';
  name: string;
  detail: string;
  time: string;
}

function SuccessIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={6} stroke={colors.primaryLight} strokeWidth={1.5} />
      <Path
        d="M5 8l2 2 4-4"
        stroke={colors.primaryLight}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ErrorIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={6} stroke={colors.coral} strokeWidth={1.5} />
      <Path
        d="M5.5 5.5l5 5M10.5 5.5l-5 5"
        stroke={colors.coral}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ActivityItem({ type, name, detail, time }: Props) {
  return (
    <View style={styles.item}>
      <View style={[styles.iconBox, type === 'success' ? styles.iconSuccess : styles.iconError]}>
        {type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
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
