import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type AppIconName =
  | 'add-outline'
  | 'calendar-outline'
  | 'checkmark'
  | 'checkmark-outline'
  | 'checkbox-outline'
  | 'chevron-down'
  | 'close-outline'
  | 'download-outline'
  | 'eye-off-outline'
  | 'eye-outline'
  | 'grid'
  | 'grid-outline'
  | 'home'
  | 'home-outline'
  | 'logo-google'
  | 'people'
  | 'people-outline'
  | 'share-social-outline'
  | 'sparkles-outline'
  | 'square-outline'
  | 'stats-chart'
  | 'stats-chart-outline'
  | 'swap-horizontal'
  | 'swap-horizontal-outline'
  | 'wallet'
  | 'wallet-outline';

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: string;
};

function IconCanvas({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export function AppIcon({ name, size = 18, color = '#122033' }: AppIconProps) {
  const strokeWidth = 1.9;

  if (name === 'logo-google') {
    return (
      <View style={[styles.googleWrap, { width: size, height: size }]}>
        <Text style={[styles.googleText, { fontSize: Math.max(12, size * 0.9), color }]}>G</Text>
      </View>
    );
  }

  if (name === 'home' || name === 'home-outline') {
    return (
      <IconCanvas size={size}>
        <Path d="M4 10.5 12 4l8 6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M6.5 9.5V20h11V9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </IconCanvas>
    );
  }

  if (name === 'swap-horizontal' || name === 'swap-horizontal-outline') {
    return (
      <IconCanvas size={size}>
        <Line x1="5" y1="8" x2="16.5" y2="8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Polyline points="13.5,5 17.5,8 13.5,11" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="19" y1="16" x2="7.5" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Polyline points="10.5,13 6.5,16 10.5,19" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </IconCanvas>
    );
  }

  if (name === 'wallet' || name === 'wallet-outline') {
    return (
      <IconCanvas size={size}>
        <Rect x="3.5" y="6.5" width="17" height="11" rx="2.5" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M7 6.5V5.8c0-.7.6-1.3 1.3-1.3h9.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Circle cx="16.5" cy="12" r="1" fill={color} />
      </IconCanvas>
    );
  }

  if (name === 'people' || name === 'people-outline') {
    return (
      <IconCanvas size={size}>
        <Circle cx="9" cy="9" r="2.5" stroke={color} strokeWidth={strokeWidth} />
        <Circle cx="16" cy="10" r="2" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M5.5 18c.7-2.2 2.5-3.5 5-3.5s4.3 1.3 5 3.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Path d="M14.5 17.5c.5-1.6 1.8-2.5 3.6-2.5 1 0 1.8.2 2.4.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </IconCanvas>
    );
  }

  if (name === 'stats-chart' || name === 'stats-chart-outline') {
    return (
      <IconCanvas size={size}>
        <Polyline points="4,16.5 9,12.5 12.5,14.5 18.5,7.5" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="4" y1="19" x2="20" y2="19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </IconCanvas>
    );
  }

  if (name === 'grid' || name === 'grid-outline') {
    return (
      <IconCanvas size={size}>
        {[5, 13].flatMap((x) =>
          [5, 13].map((y) => <Rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.2" stroke={color} strokeWidth={strokeWidth} />),
        )}
      </IconCanvas>
    );
  }

  if (name === 'checkbox-outline') {
    return (
      <IconCanvas size={size}>
        <Rect x="4" y="4" width="16" height="16" rx="3" stroke={color} strokeWidth={strokeWidth} />
        <Polyline points="8.2,12.4 10.9,15.1 16.4,9.6" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </IconCanvas>
    );
  }

  if (name === 'square-outline') {
    return (
      <IconCanvas size={size}>
        <Rect x="4" y="4" width="16" height="16" rx="3" stroke={color} strokeWidth={strokeWidth} />
      </IconCanvas>
    );
  }

  if (name === 'sparkles-outline') {
    return (
      <IconCanvas size={size}>
        <Path d="M12 4.8 13.7 9l4.3 1.7-4.3 1.7L12 16.6l-1.7-4.2L6 10.7 10.3 9 12 4.8Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Line x1="18" y1="4.5" x2="18" y2="7.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Line x1="16.5" y1="6" x2="19.5" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </IconCanvas>
    );
  }

  if (name === 'eye-outline' || name === 'eye-off-outline') {
    return (
      <IconCanvas size={size}>
        <Path d="M2.8 12s3.4-5 9.2-5 9.2 5 9.2 5-3.4 5-9.2 5-9.2-5-9.2-5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Circle cx="12" cy="12" r="2.2" stroke={color} strokeWidth={strokeWidth} />
        {name === 'eye-off-outline' ? <Line x1="5" y1="19" x2="19" y2="5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /> : null}
      </IconCanvas>
    );
  }

  if (name === 'calendar-outline') {
    return (
      <IconCanvas size={size}>
        <Rect x="4" y="5.5" width="16" height="14" rx="2.5" stroke={color} strokeWidth={strokeWidth} />
        <Line x1="4" y1="9" x2="20" y2="9" stroke={color} strokeWidth={strokeWidth} />
        <Line x1="8" y1="3.8" x2="8" y2="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Line x1="16" y1="3.8" x2="16" y2="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </IconCanvas>
    );
  }

  if (name === 'chevron-down') {
    return (
      <IconCanvas size={size}>
        <Polyline points="6,9 12,15 18,9" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </IconCanvas>
    );
  }

  if (name === 'checkmark' || name === 'checkmark-outline') {
    return (
      <IconCanvas size={size}>
        <Polyline points="5.2,12.4 9.7,16.6 18.8,7.6" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </IconCanvas>
    );
  }

  if (name === 'add-outline') {
    return (
      <IconCanvas size={size}>
        <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </IconCanvas>
    );
  }

  if (name === 'close-outline') {
    return (
      <IconCanvas size={size}>
        <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </IconCanvas>
    );
  }

  if (name === 'download-outline') {
    return (
      <IconCanvas size={size}>
        <Line x1="12" y1="4.8" x2="12" y2="14.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Polyline points="8.3,11.2 12,14.9 15.7,11.2" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5 18.5h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </IconCanvas>
    );
  }

  if (name === 'share-social-outline') {
    return (
      <IconCanvas size={size}>
        <Circle cx="6" cy="12" r="2.1" stroke={color} strokeWidth={strokeWidth} />
        <Circle cx="17.5" cy="6.5" r="2.1" stroke={color} strokeWidth={strokeWidth} />
        <Circle cx="17.5" cy="17.5" r="2.1" stroke={color} strokeWidth={strokeWidth} />
        <Line x1="8" y1="10.9" x2="15.5" y2="7.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Line x1="8" y1="13.1" x2="15.5" y2="16.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </IconCanvas>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  googleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    fontWeight: '800',
    lineHeight: 18,
  },
});
