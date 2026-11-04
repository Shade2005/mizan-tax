// ============================================================================
// Mizan (ميزان) - Scanner Laser Beam Component
// Animated Vibrant Cyan (#00E5FF) Laser Sweep across the Reticle
// ============================================================================

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

interface ScannerLaserBeamProps {
  height?: number;
}

export const ScannerLaserBeam: React.FC<ScannerLaserBeamProps> = ({ height = 340 }) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: height - 10,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [height, translateY]);

  return (
    <Animated.View
      style={[
        styles.laserContainer,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.laserLine} />
      <View style={styles.laserGlow} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  laserContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 5,
    zIndex: 10,
  },
  laserLine: {
    height: 3,
    backgroundColor: colors.brand.cyan,
    shadowColor: colors.brand.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  laserGlow: {
    height: 24,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    marginTop: -12,
  },
});
