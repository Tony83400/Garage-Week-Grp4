import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Sidebar from './Sidebar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: 'dashboard' | 'planning' | 'sites';
}

export default function MobileDrawer({ isOpen, onClose, activeRoute }: Props) {
  const translateX = useRef(new Animated.Value(-240)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      translateX.setValue(-240);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0.45, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <View style={s.root}>
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[s.drawer, { transform: [{ translateX }] }]}>
        <Sidebar activeRoute={activeRoute} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: 240,
  },
});
