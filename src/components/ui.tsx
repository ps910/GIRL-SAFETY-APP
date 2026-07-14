/**
 * SafeHer Design System v8.0 — Midnight Indigo Primitives
 * ═══════════════════════════════════════════════════════════
 * Typography: Space Grotesk (headings/buttons) + DM Sans (body)
 * Palette: Deep midnight indigo with semantic danger/success/warning
 *
 * Reusable building blocks for every screen.
 */
import React, { ReactNode, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, Animated, ActivityIndicator, Switch, ViewStyle,
  TextStyle, StyleProp, Pressable, Easing, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows, animation, typography as typo } from '@safeher/shared';

// ────────────────────────────────────────────────────────────────
//  RE-EXPORT TOKENS for backward compat  (import { T } from 'ui')
// ────────────────────────────────────────────────────────────────
export const T = colors;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ────────────────────────────────────────────────────────────────
//  SCREEN — page wrapper with consistent padding + status bar
// ────────────────────────────────────────────────────────────────
export function Screen({ children, scroll = true, style, gradient = false }: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  gradient?: boolean;
}) {
  return (
    <View style={[s.screen, gradient && s.screenGradient, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {scroll
        ? <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>{children}</ScrollView>
        : <View style={[s.scroll, { flex: 1 }]}>{children}</View>}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  HEADER — back button + title + optional action
// ────────────────────────────────────────────────────────────────
export function Header({ title, subtitle, onBack, right }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={s.header}>
      {onBack && (
        <Pressable onPress={onBack} style={s.iconBtn} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
      )}
      <View style={{ flex: 1, marginLeft: onBack ? 12 : 0 }}>
        <Text style={s.headerTitle}>{title}</Text>
        {subtitle && <Text style={s.headerSub}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  GLASS CARD — elevated surface with subtle indigo border
// ────────────────────────────────────────────────────────────────
export function Card({ children, style, padded = true, onPress, elevated = false }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
  elevated?: boolean;
}) {
  const baseStyle = [
    s.card,
    elevated && s.cardElevated,
    padded && { padding: spacing.lg },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [baseStyle, pressed && { opacity: 0.72, backgroundColor: colors.cardHover }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}

// ────────────────────────────────────────────────────────────────
//  SECTION TITLE — uppercase label
// ────────────────────────────────────────────────────────────────
export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.section, style]}>{children}</Text>;
}

// ────────────────────────────────────────────────────────────────
//  LIST ROW — icon + title + subtitle + chevron
// ────────────────────────────────────────────────────────────────
export function Row({ icon, iconColor, title, subtitle, right, onPress, danger, last }: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const Wrap: any = onPress ? Pressable : View;
  const tint = iconColor || (danger ? colors.danger : colors.primary);
  return (
    <Wrap
      onPress={onPress}
      style={({ pressed }: any) => [s.row, !last && s.rowDivider, pressed && onPress && { backgroundColor: colors.surfaceHover }]}
    >
      {icon && (
        <View style={[s.rowIcon, { backgroundColor: `${tint}1F` }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
      )}
      <View style={{ flex: 1, marginLeft: icon ? 12 : 0 }}>
        <Text style={[s.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle && <Text style={s.rowSub}>{subtitle}</Text>}
      </View>
      {right || (onPress && <Ionicons name="chevron-forward" size={16} color={colors.textHint} />)}
    </Wrap>
  );
}

// ────────────────────────────────────────────────────────────────
//  PRIMARY BUTTON — spring animation + glow
// ────────────────────────────────────────────────────────────────
export function PrimaryBtn({ children, onPress, loading, style, danger, icon, disabled }: {
  children: ReactNode;
  onPress?: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  danger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: animation.button.pressScale, useNativeDriver: true, tension: animation.spring.tension }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: animation.spring.tension }).start();
  const bg = danger ? colors.danger : colors.primary;
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: isDisabled ? 0.5 : 1 }}>
      <TouchableOpacity
        style={[s.primaryBtn, { backgroundColor: bg, shadowColor: bg }, style]}
        onPressIn={onIn}
        onPressOut={onOut}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={1}
        accessibilityRole="button"
      >
        {loading ? <ActivityIndicator color={colors.white} /> : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon && <Ionicons name={icon} size={18} color={colors.white} />}
            <Text style={s.primaryBtnText}>{children}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────────
//  GHOST / OUTLINE BUTTON
// ────────────────────────────────────────────────────────────────
export function GhostBtn({ children, onPress, style, icon, color = colors.primary }: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={[s.ghostBtn, { borderColor: color }, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <Ionicons name={icon} size={16} color={color} />}
        <Text style={[s.ghostBtnText, { color }]}>{children}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────────
//  INPUT — glass input with focus border
// ────────────────────────────────────────────────────────────────
export function Input(props: React.ComponentProps<typeof TextInput> & { style?: StyleProp<ViewStyle>; label?: string }) {
  const [focused, setFocused] = React.useState(false);
  const { style, label, ...rest } = props;
  return (
    <View>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={[s.inputWrap, focused && { borderColor: colors.borderActive }, style]}>
        <TextInput
          {...rest}
          placeholderTextColor={colors.textHint}
          style={s.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  LABEL
// ────────────────────────────────────────────────────────────────
export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

// ────────────────────────────────────────────────────────────────
//  STATUS PILL — colored badge
// ────────────────────────────────────────────────────────────────
export function Pill({ icon, label, color = colors.primary, active }: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  active?: boolean;
}) {
  const tint = active ? color : colors.textSub;
  const bg = active ? `${color}1A` : colors.surface;
  return (
    <View style={[s.pill, { borderColor: active ? color : colors.border, backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={10} color={tint} />}
      <Text style={[s.pillText, { color: tint }]}>{label}</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  TOGGLE ROW — row with switch
// ────────────────────────────────────────────────────────────────
export function ToggleRow({ icon, iconColor, title, subtitle, value, onValueChange, last }: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  const tint = iconColor || colors.primary;
  return (
    <View style={[s.row, !last && s.rowDivider]}>
      {icon && (
        <View style={[s.rowIcon, { backgroundColor: `${tint}1F` }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
      )}
      <View style={{ flex: 1, marginLeft: icon ? 12 : 0 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle && <Text style={s.rowSub}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(99,102,241,0.1)', true: colors.primaryGlow }}
        thumbColor={value ? colors.primary : '#64748B'}
        ios_backgroundColor="rgba(99,102,241,0.1)"
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  EMPTY STATE
// ────────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'sparkles-outline', title, subtitle, action }: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle && <Text style={s.emptySub}>{subtitle}</Text>}
      {action && <View style={{ marginTop: 18 }}>{action}</View>}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  STAT CARD
// ────────────────────────────────────────────────────────────────
export function Stat({ icon, label, value, color = colors.primary }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View style={s.stat}>
      <View style={[s.statIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  DIVIDER
// ────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  return <View style={[s.divider, style]} />;
}

// ────────────────────────────────────────────────────────────────
//  STATUS DOT — pulsing live indicator
// ────────────────────────────────────────────────────────────────
export function StatusDot({ color = colors.success, pulse = false, size = 8 }: {
  color?: string;
  pulse?: boolean;
  size?: number;
}) {
  const opacity = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (pulse) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────
//  ANIMATED GRADIENT ORB — subtle background decoration
// ────────────────────────────────────────────────────────────────
export function FloatingOrb({ size, color, startX, startY, duration }: {
  size: number; color: string; startX: number; startY: number; duration: number;
}) {
  const x = useRef(new Animated.Value(startX)).current;
  const y = useRef(new Animated.Value(startY)).current;
  React.useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(x, { toValue: startX + 30, duration: duration * 0.6, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(x, { toValue: startX - 15, duration: duration * 0.4, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(x, { toValue: startX,      duration: duration * 0.3, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(y, { toValue: startY - 40, duration: duration * 0.5, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(y, { toValue: startY + 20, duration: duration * 0.5, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(y, { toValue: startY,      duration: duration * 0.3, useNativeDriver: true }),
        ]),
      ]).start(animate);
    };
    animate();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity: 0.08,
        transform: [{ translateX: x }, { translateY: y }],
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────
//  SOS BUTTON — animated pulse with danger glow
// ────────────────────────────────────────────────────────────────
export function SOSButton({ onPress, isActive, size = 184, disabled }: {
  onPress: () => void;
  isActive?: boolean;
  size?: number;
  disabled?: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 0.95, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      glow.start();
      return () => { pulse.stop(); glow.stop(); };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.3);
    }
  }, [isActive]);

  const onIn  = () => Animated.spring(pressScale, { toValue: 0.92, useNativeDriver: true, tension: 300 }).start();
  const onOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, tension: 300 }).start();

  const btnColor = isActive ? colors.danger : colors.danger;
  const glowColor = isActive ? colors.dangerGlow : 'rgba(239, 68, 68, 0.15)';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 40,
          height: size + 40,
          borderRadius: (size + 40) / 2,
          backgroundColor: glowColor,
          opacity: glowAnim,
          transform: [{ scale: pulseAnim }],
        }}
      />
      {/* Inner glow ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
          borderWidth: 2,
          borderColor: isActive ? colors.danger : 'rgba(239, 68, 68, 0.3)',
          opacity: isActive ? 0.6 : 0.2,
          transform: [{ scale: pulseAnim }],
        }}
      />
      {/* Main button */}
      <Animated.View style={{ transform: [{ scale: Animated.multiply(pressScale, pulseAnim) }] }}>
        <TouchableOpacity
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: btnColor,
              alignItems: 'center',
              justifyContent: 'center',
              ...shadows.dangerGlow,
            },
          ]}
          onPressIn={onIn}
          onPressOut={onOut}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={1}
          accessibilityLabel={isActive ? 'Stop SOS' : 'Trigger SOS Emergency'}
          accessibilityRole="button"
        >
          <Ionicons name={isActive ? 'close' : 'alert'} size={size * 0.28} color={colors.white} />
          <Text style={{
            color: colors.white,
            fontSize: size * 0.13,
            fontWeight: '800',
            marginTop: 4,
            letterSpacing: 2,
          }}>
            {isActive ? 'STOP' : 'SOS'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  PROTECTION STATUS TILE — compact status indicator
// ────────────────────────────────────────────────────────────────
export function ProtectionTile({ icon, label, value, color, active }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  active: boolean;
}) {
  return (
    <View style={s.protectionTile}>
      <View style={[s.protectionTileIcon, { backgroundColor: active ? `${color}1F` : colors.surface }]}>
        <Ionicons name={icon} size={16} color={active ? color : colors.textHint} />
      </View>
      <Text style={[s.protectionTileLabel, { color: active ? colors.text : colors.textHint }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <StatusDot color={active ? color : colors.textHint} size={6} pulse={active} />
        <Text style={[s.protectionTileValue, { color: active ? color : colors.textHint }]}>{value}</Text>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
//  CONTEXT CARD — time-aware recommendation banner
// ────────────────────────────────────────────────────────────────
export function ContextCard({ title, message, actionLabel, onAction, icon, accentColor = colors.primary }: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
}) {
  return (
    <Card style={[s.contextCard, { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {icon && (
          <View style={[s.contextIcon, { backgroundColor: `${accentColor}1F` }]}>
            <Ionicons name={icon} size={20} color={accentColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.contextTitle}>{title}</Text>
          <Text style={s.contextMessage}>{message}</Text>
          {actionLabel && onAction && (
            <TouchableOpacity onPress={onAction} style={[s.contextAction, { backgroundColor: `${accentColor}1A` }]}>
              <Text style={[s.contextActionText, { color: accentColor }]}>{actionLabel}</Text>
              <Ionicons name="arrow-forward" size={14} color={accentColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
//  STYLES
// ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenGradient: { backgroundColor: colors.bgGradientStart },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 40,
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing['2xl'] },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typo.title.fontSize,
    fontWeight: typo.title.fontWeight,
    color: colors.white,
    letterSpacing: typo.title.letterSpacing,
  },
  headerSub: {
    fontSize: typo.bodySmall.fontSize,
    fontWeight: typo.bodySmall.fontWeight as any,
    color: colors.textSub,
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardElevated: {
    backgroundColor: colors.cardElevated,
    ...shadows.md,
  },

  // Section
  section: {
    fontSize: typo.caption.fontSize,
    fontWeight: '700' as any,
    color: colors.textSub,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
    marginBottom: spacing.sm + 2,
    textTransform: 'uppercase',
  },

  // Row
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: spacing.lg },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowTitle: {
    fontSize: typo.bodyMedium.fontSize,
    fontWeight: '600' as any,
    color: colors.text,
  },
  rowSub: {
    fontSize: typo.bodySmall.fontSize,
    color: colors.textSub,
    marginTop: 2,
  },

  // Buttons
  primaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: radius.lg,
    elevation: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '700' as any,
    fontSize: typo.button.fontSize,
    letterSpacing: typo.button.letterSpacing,
  },
  ghostBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  ghostBtnText: {
    fontWeight: '600' as any,
    fontSize: typo.button.fontSize,
    letterSpacing: typo.button.letterSpacing,
  },

  // Input
  inputWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    color: colors.white,
    fontSize: typo.body.fontSize,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
  },
  label: {
    color: colors.textSub,
    fontSize: typo.caption.fontSize,
    fontWeight: '700' as any,
    marginBottom: 6,
    marginTop: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // Pill
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.xs, borderWidth: 1,
  },
  pillText: {
    fontSize: typo.caption.fontSize,
    fontWeight: '600' as any,
    letterSpacing: 0.3,
  },

  // Empty
  empty: { alignItems: 'center', padding: spacing['3xl'] },
  emptyIcon: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: typo.heading.fontSize,
    fontWeight: '700' as any,
    textAlign: 'center',
  },
  emptySub: {
    color: colors.textSub,
    fontSize: typo.bodySmall.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Stat
  stat: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  statIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as any,
    color: colors.white,
  },
  statLabel: {
    fontSize: typo.caption.fontSize,
    color: colors.textSub,
    marginTop: 2,
    fontWeight: '500' as any,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.lg,
  },

  // Protection tiles
  protectionTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
  },
  protectionTileIcon: {
    width: 32, height: 32, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  protectionTileLabel: {
    fontSize: 10,
    fontWeight: '600' as any,
    letterSpacing: 0.3,
  },
  protectionTileValue: {
    fontSize: 10,
    fontWeight: '700' as any,
  },

  // Context card
  contextCard: {
    padding: spacing.lg,
    borderLeftWidth: 3,
  },
  contextIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  contextTitle: {
    fontSize: typo.subheading.fontSize,
    fontWeight: '600' as any,
    color: colors.white,
    marginBottom: 4,
  },
  contextMessage: {
    fontSize: typo.bodySmall.fontSize,
    color: colors.textSub,
    lineHeight: 18,
  },
  contextAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  contextActionText: {
    fontSize: typo.bodySmall.fontSize,
    fontWeight: '600' as any,
  },
});

export default {
  T, Screen, Header, Card, SectionTitle, Row, PrimaryBtn, GhostBtn,
  Input, Label, Pill, ToggleRow, EmptyState, Stat, FloatingOrb,
  SOSButton, ProtectionTile, ContextCard, StatusDot, Divider,
};
