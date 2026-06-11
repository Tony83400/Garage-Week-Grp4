import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedBlobProps {
  size: number;
  color: string;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  delay?: number;
}

export default function AnimatedBlob({
  size,
  color,
  top,
  bottom,
  left,
  right,
  delay = 0,
}: AnimatedBlobProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(30, {
        duration: 12000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    translateY.value = withRepeat(
      withTiming(20, {
        duration: 12000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    scale.value = withRepeat(
      withTiming(1.08, {
        duration: 12000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.25,
          top,
          bottom,
          left,
          right,
        },
        animatedStyle,
      ]}
    />
  );
}
