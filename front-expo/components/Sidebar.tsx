import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';

function LogoIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Path d="M4 11 C4 7 7 4 11 4" stroke="white" strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 2L11 4L8.5 4Z" fill="white" />
      <Path d="M18 11 C18 15 15 18 11 18" stroke="white" strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 20L11 18L13.5 18Z" fill="white" />
      <Path
        d="M11 6 C14 6 16 8.5 16 11.5 C16 14 13.5 16 11 16 C8.5 16 6.5 14 6.5 11.5 C6.5 8.5 8 6 11 6Z"
        fill="rgba(255,255,255,0.3)"
      />
    </Svg>
  );
}

interface Props {
  activeRoute: 'dashboard' | 'planning' | 'sites';
  style?: object;
}

export default function Sidebar({ activeRoute, style }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.sidebarDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.sidebar, style]}
    >
      <View style={[styles.logoSection, { paddingTop: Math.max(24, insets.top + 10) }]}>
        <LinearGradient
          colors={[colors.primaryLight, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoIcon}
        >
          <LogoIcon />
        </LinearGradient>
        <View>
          <Text style={styles.logoName}>ArchAppli</Text>
          <Text style={styles.logoSub}>portail admin</Text>
        </View>
      </View>

      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navItem, activeRoute === 'dashboard' && styles.navItemActive]}
          onPress={() => router.push('/dashboard')}
        >
          <Ionicons
            name="grid-outline"
            size={18}
            color={activeRoute === 'dashboard' ? colors.accentLight : 'rgba(255,255,255,0.55)'}
          />
          <Text style={[styles.navText, activeRoute === 'dashboard' && styles.navTextActive]}>
            Tableau de Bord
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeRoute === 'planning' && styles.navItemActive]}
          onPress={() => router.push('/planning')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeRoute === 'planning' ? colors.accentLight : 'rgba(255,255,255,0.55)'}
          />
          <Text style={[styles.navText, activeRoute === 'planning' && styles.navTextActive]}>
            Planning
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeRoute === 'sites' && styles.navItemActive]}
          onPress={() => router.push('/sites')}
        >
          <Ionicons
            name="location-outline"
            size={18}
            color={activeRoute === 'sites' ? colors.accentLight : 'rgba(255,255,255,0.55)'}
          />
          <Text style={[styles.navText, activeRoute === 'sites' && styles.navTextActive]}>
            Sites de collecte
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.navItem, styles.logoutItem]}
          onPress={() => router.replace('/')}
        >
          <Ionicons name="log-out-outline" size={18} color="rgba(231,111,81,0.7)" />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  logoSub: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nav: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 20,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(82,183,136,0.2)',
  },
  navText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
  },
  navTextActive: {
    color: colors.accentLight,
  },
  bottom: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  logoutItem: {},
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(231,111,81,0.7)',
  },
});
