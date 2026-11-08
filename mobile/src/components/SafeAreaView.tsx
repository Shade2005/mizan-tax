// ============================================================================
// Mizan (ميزان) - Robust Pure JS SafeAreaView Component
// Uses useSafeAreaInsets with a standard React Native View.
// Eliminates Fabric C++ ShadowNode zero-size rendering bugs on Android.
// ============================================================================

import React, { forwardRef } from 'react';
import { View, StyleProp, ViewStyle, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Edge = 'top' | 'right' | 'bottom' | 'left';

export interface SafeAreaViewProps extends ViewProps {
  edges?: readonly Edge[] | Edge[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const SafeAreaView = forwardRef<View, SafeAreaViewProps>(({
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  children,
  ...rest
}, ref) => {
  const insets = useSafeAreaInsets();
  const edgeList = Array.isArray(edges) ? edges : [];

  const paddingStyle: ViewStyle = {
    paddingTop: edgeList.includes('top') ? (insets?.top || 0) : 0,
    paddingBottom: edgeList.includes('bottom') ? (insets?.bottom || 0) : 0,
    paddingLeft: edgeList.includes('left') ? (insets?.left || 0) : 0,
    paddingRight: edgeList.includes('right') ? (insets?.right || 0) : 0,
  };

  return (
    <View ref={ref as any} style={[{ flex: 1 }, paddingStyle, style]} {...rest}>
      {children}
    </View>
  );
});

export default SafeAreaView;
