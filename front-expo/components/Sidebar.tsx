import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
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

function DashboardIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.accentLight : 'rgba(255,255,255,0.55)';
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x={1} y={1} width={7} height={7} rx={2} stroke={stroke} strokeWidth={1.5} />
      <Rect x={10} y={1} width={7} height={7} rx={2} stroke={stroke} strokeWidth={1.5} />
      <Rect x={1} y={10} width={7} height={7} rx={2} stroke={stroke} strokeWidth={1.5} />
      <Rect x={10} y={10} width={7} height={7} rx={2} stroke={stroke} strokeWidth={1.5} />
    </Svg>
  );
}

function PlanningIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect
        x={1} y={3} width={16} height={13} rx={2}
        stroke="rgba(255,255,255,0.55)" strokeWidth={1.5}
      />
      <Path
        d="M5 1V5M13 1V5M1 7H17"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LogoutIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M7 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4"
        stroke="rgba(231,111,81,0.7)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M12 13l4-4-4-4M16 9H7"
        stroke="rgba(231,111,81,0.7)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface Props {
  activeRoute: 'dashboard' | 'planning';
}

export default function Sidebar({ activeRoute }: Props) {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.sidebarDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.sidebar}
    >
      <View style={styles.logoSection}>
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
          <DashboardIcon active={activeRoute === 'dashboard'} />
          <Text style={[styles.navText, activeRoute === 'dashboard' && styles.navTextActive]}>
            Tableau de Bord
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <PlanningIcon />
          <Text style={styles.navText}>Planning & Tournées</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.navItem, styles.logoutItem]}
          onPress={() => router.replace('/')}
        >
          <LogoutIcon />
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
