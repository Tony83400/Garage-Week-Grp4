import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Rect, Circle, G, Line, Image as SvgImage } from 'react-native-svg';
import { colors } from '../constants/colors';

export type TruckPhase = 'arriving' | 'idle' | 'starting' | 'departing' | 'error';

interface Props {
  phase: TruckPhase;
  emailFilled: boolean;
  passwordFilled: boolean;
  onFormReady?: () => void;
  truckWidth?: number;
}

const AnimatedG = Animated.createAnimatedComponent(G);

const C = {
  cargo:       '#2E8B45',
  cargoDark:   '#256B36',
  cab:         '#1A6B8A',
  cabDark:     '#14526B',
  glass:       '#B8DDE8',
  stripe:      '#F4C430',
  wheelDark:   '#1C1C1C',
  wheelMid:    '#2E2E2E',
  wheelHub:    '#505050',
  wheelSpoke:  '#3A3A3A',
  binBody:     '#6B3F1A',
  binLid:      colors.accent,
  binLidDark:  colors.primaryLight,
  binStripe:   '#74C69D',
  tailgate:    colors.accentLight,
  tailgateShade: colors.accent,
  exhaust:     '#555',
};

const SPRING_BIN  = { damping: 14, stiffness: 180 };
const SPRING_FAST = { damping: 18, stiffness: 220 };

// viewBox fixe 240×100 — pas d'extension, tout reste dans les bornes
const VB_W = 240;
const VB_H = 100;

export default function TruckAnimation({
  phase, emailFilled, passwordFilled, onFormReady, truckWidth = 210,
}: Props) {
  const truckHeight = Math.round(truckWidth * (VB_H / VB_W));

  const truckX         = useSharedValue(-truckWidth - 40);
  const vibX           = useSharedValue(0);
  const wheelRot       = useSharedValue(0);

  // Hayon : scaleY 1→0 (se rétracte vers le haut depuis le bas)
  const tailgateScaleY = useSharedValue(1);

  // Bacs : scale + léger translateY pour l'effet de chute
  const bin1Scale   = useSharedValue(0);
  const bin1Opacity = useSharedValue(0);
  const bin1Y       = useSharedValue(-14);

  const bin2Scale   = useSharedValue(0);
  const bin2Opacity = useSharedValue(0);
  const bin2Y       = useSharedValue(-14);

  // ── Arrivée ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'arriving') return;
    truckX.value = withSpring(0, { damping: 18, stiffness: 85, mass: 1.4 }, (done) => {
      if (!done) return;
      // Hayon se rétracte (scaleY 1 → 0)
      tailgateScaleY.value = withDelay(
        300,
        withTiming(0, { duration: 620, easing: Easing.out(Easing.cubic) }, () => {
          if (onFormReady) runOnJS(onFormReady)();
        }),
      );
    });
  }, [phase]);

  // ── Bac 1 (email) ────────────────────────────────────────────────────
  useEffect(() => {
    if (emailFilled) {
      bin1Opacity.value = withTiming(1, { duration: 180 });
      bin1Y.value       = withSpring(0, SPRING_BIN);
      bin1Scale.value   = withSpring(1, SPRING_BIN);
    } else {
      bin1Scale.value   = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      bin1Y.value       = withTiming(-14, { duration: 200 });
      bin1Opacity.value = withDelay(150, withTiming(0, { duration: 80 }));
    }
  }, [emailFilled]);

  // ── Bac 2 (mot de passe) ─────────────────────────────────────────────
  useEffect(() => {
    if (passwordFilled) {
      bin2Opacity.value = withTiming(1, { duration: 180 });
      bin2Y.value       = withSpring(0, SPRING_BIN);
      bin2Scale.value   = withSpring(1, SPRING_BIN);
    } else {
      bin2Scale.value   = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      bin2Y.value       = withTiming(-14, { duration: 200 });
      bin2Opacity.value = withDelay(150, withTiming(0, { duration: 80 }));
    }
  }, [passwordFilled]);

  // ── Démarrage moteur ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'starting') {
      vibX.value = withRepeat(
        withSequence(withTiming(3, { duration: 50 }), withTiming(-3, { duration: 50 })),
        -1, true,
      );
      wheelRot.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }), -1, false,
      );
    } else if (phase !== 'departing') {
      cancelAnimation(vibX);
      cancelAnimation(wheelRot);
      vibX.value = withTiming(0, { duration: 80 });
    }
  }, [phase]);

  // ── Départ réussi ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'departing') return;
    cancelAnimation(vibX);
    vibX.value = withTiming(0, { duration: 60 });
    // Hayon se referme avant de partir
    tailgateScaleY.value = withTiming(1, { duration: 220 });
    wheelRot.value = withRepeat(
      withTiming(360, { duration: 360, easing: Easing.linear }), -1, false,
    );
    truckX.value = withDelay(150, withTiming(truckWidth + 60, {
      duration: 500, easing: Easing.in(Easing.quad),
    }));
  }, [phase]);

  // ── Erreur ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'error') return;
    cancelAnimation(vibX);
    cancelAnimation(wheelRot);
    vibX.value = withTiming(0, { duration: 60 });

    truckX.value = withSequence(
      withTiming(16, { duration: 60 }),
      withTiming(-12, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-5, { duration: 55 }),
      withTiming(0, { duration: 50 }),
    );

    // Hayon se rouvre
    tailgateScaleY.value = withDelay(
      280, withTiming(0, { duration: 460, easing: Easing.out(Easing.cubic) }),
    );

    // Bacs éjectés vers le bas + disparition
    bin1Scale.value   = withDelay(540, withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }));
    bin1Y.value       = withDelay(540, withTiming(18, { duration: 280 }));
    bin1Opacity.value = withDelay(700, withTiming(0, { duration: 120 }));

    bin2Scale.value   = withDelay(660, withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }));
    bin2Y.value       = withDelay(660, withTiming(18, { duration: 280 }));
    bin2Opacity.value = withDelay(820, withTiming(0, { duration: 120 }));
  }, [phase]);

  // ── Animated styles / props ───────────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: truckX.value + vibX.value }],
  }));

  const wheel1Props = useAnimatedProps(() => ({
    rotation: wheelRot.value, originX: 42, originY: 83,
  }));
  const wheel2Props = useAnimatedProps(() => ({
    rotation: wheelRot.value, originX: 180, originY: 83,
  }));

  // Hayon : scaleY s'annule depuis le bas (origin = bas du hayon)
  const tailgateProps = useAnimatedProps(() => ({
    scaleY: tailgateScaleY.value,
    originX: 9,
    originY: 76,  // origine en bas → le hayon "remonte" en se rétractant
  }));

  const bin1Props = useAnimatedProps(() => ({
    opacity:    bin1Opacity.value,
    scale:      bin1Scale.value,
    translateY: bin1Y.value,
    originX:    46,
    originY:    48,
  }));
  const bin2Props = useAnimatedProps(() => ({
    opacity:    bin2Opacity.value,
    scale:      bin2Scale.value,
    translateY: bin2Y.value,
    originX:    90,
    originY:    48,
  }));

  return (
    <Animated.View style={[{ width: truckWidth, height: truckHeight }, containerStyle]}>
      <Svg width={truckWidth} height={truckHeight} viewBox={`0 0 ${VB_W} ${VB_H}`}>

        {/* ── Cargo ── */}
        <Rect x={10} y={20} width={148} height={56} rx={4} fill={C.cargo} />
        <Rect x={10} y={20} width={148} height={5} rx={2} fill="rgba(255,255,255,0.10)" />
        <Rect x={10} y={49} width={148} height={2} fill={C.cargoDark} />
        <Rect x={10} y={63} width={148} height={7} fill={C.stripe} opacity={0.85} />
        <Rect x={10} y={63} width={148} height={1} fill="rgba(255,255,255,0.30)" />

        {/* Logo Les Alchimistes */}
        <SvgImage
          x={14} y={22} width={140} height={38}
          href={require('../assets/télécharger.png')}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* ── Bac 1 (email) ── */}
        <AnimatedG animatedProps={bin1Props}>
          <Rect x={32} y={34} width={28} height={28} rx={3} fill={C.binBody} />
          <Rect x={32} y={30} width={28} height={7}  rx={2} fill={C.binLid} />
          <Rect x={40} y={24} width={12} height={9}  rx={1} fill={C.binLidDark} />
          <Rect x={46} y={36} width={2}  height={22} rx={1} fill={C.binStripe} opacity={0.5} />
        </AnimatedG>

        {/* ── Bac 2 (mot de passe) ── */}
        <AnimatedG animatedProps={bin2Props}>
          <Rect x={76} y={34} width={28} height={28} rx={3} fill={C.binBody} />
          <Rect x={76} y={30} width={28} height={7}  rx={2} fill={C.binLid} />
          <Rect x={84} y={24} width={12} height={9}  rx={1} fill={C.binLidDark} />
          <Rect x={90} y={36} width={2}  height={22} rx={1} fill={C.binStripe} opacity={0.5} />
        </AnimatedG>

        {/* ── Hayon — dessiné PAR-DESSUS les bacs ── */}
        <AnimatedG animatedProps={tailgateProps}>
          <Rect x={4}  y={20} width={9} height={56} rx={2} fill={C.tailgate} />
          <Rect x={4}  y={33} width={9} height={3}  rx={1} fill={C.tailgateShade} />
          <Rect x={4}  y={58} width={9} height={3}  rx={1} fill={C.tailgateShade} />
          <Rect x={13} y={20} width={2} height={56} rx={1} fill="rgba(255,255,255,0.20)" />
        </AnimatedG>

        {/* ── Cabine ── */}
        <Rect x={158} y={18} width={54} height={14} rx={6} fill={C.cab} />
        <Rect x={158} y={27} width={66} height={49} rx={5} fill={C.cab} />
        <Rect x={163} y={30} width={52} height={30} rx={4} fill={C.glass} opacity={0.90} />
        <Rect x={165} y={32} width={10} height={26} rx={2} fill="rgba(255,255,255,0.30)" />
        <Rect x={208} y={44} width={10} height={22} rx={3} fill={C.cabDark} />
        <Rect x={209} y={55} width={6}  height={7}  rx={2} fill="#FFE082" />
        <Rect x={209} y={46} width={6}  height={2}  rx={1} fill="rgba(0,0,0,0.35)" />
        <Rect x={209} y={50} width={6}  height={2}  rx={1} fill="rgba(0,0,0,0.22)" />
        {/* Rétroviseur */}
        <Rect x={155} y={34} width={7}  height={4}  rx={1} fill={C.cabDark} />
        <Rect x={152} y={33} width={6}  height={6}  rx={1} fill={C.cab} />
        {/* Poignée de porte */}
        <Rect x={186} y={47} width={12} height={3}  rx={1.5} fill={C.cabDark} />
        <Rect x={158} y={63} width={58} height={7}  fill={C.stripe} opacity={0.85} />
        {/* Échappement */}
        <Rect x={196} y={7}  width={5}  height={22} rx={2} fill={C.exhaust} />
        <Rect x={194} y={5}  width={9}  height={5}  rx={2} fill="#3A3A3A" />

        {/* ── Châssis ── */}
        <Rect x={10}  y={78} width={208} height={7} rx={3} fill={C.cabDark} />
        <Rect x={162} y={73} width={26}  height={6} rx={2} fill={C.cabDark} />

        {/* ── Roue arrière ── */}
        <AnimatedG animatedProps={wheel1Props}>
          <Circle cx={42} cy={83} r={16} fill={C.wheelDark} />
          <Circle cx={42} cy={83} r={11} fill={C.wheelMid} />
          <Circle cx={42} cy={83} r={4.5} fill={C.wheelHub} />
          <Line x1={42} y1={67} x2={42} y2={99} stroke={C.wheelSpoke} strokeWidth={2.5} />
          <Line x1={26} y1={83} x2={58} y2={83} stroke={C.wheelSpoke} strokeWidth={2.5} />
          <Line x1={30.7} y1={71.7} x2={53.3} y2={94.3} stroke={C.wheelSpoke} strokeWidth={1.8} />
          <Line x1={53.3} y1={71.7} x2={30.7} y2={94.3} stroke={C.wheelSpoke} strokeWidth={1.8} />
        </AnimatedG>

        {/* ── Roue avant ── */}
        <AnimatedG animatedProps={wheel2Props}>
          <Circle cx={180} cy={83} r={16} fill={C.wheelDark} />
          <Circle cx={180} cy={83} r={11} fill={C.wheelMid} />
          <Circle cx={180} cy={83} r={4.5} fill={C.wheelHub} />
          <Line x1={180} y1={67} x2={180} y2={99} stroke={C.wheelSpoke} strokeWidth={2.5} />
          <Line x1={164} y1={83} x2={196} y2={83} stroke={C.wheelSpoke} strokeWidth={2.5} />
          <Line x1={168.7} y1={71.7} x2={191.3} y2={94.3} stroke={C.wheelSpoke} strokeWidth={1.8} />
          <Line x1={191.3} y1={71.7} x2={168.7} y2={94.3} stroke={C.wheelSpoke} strokeWidth={1.8} />
        </AnimatedG>

      </Svg>
    </Animated.View>
  );
}
