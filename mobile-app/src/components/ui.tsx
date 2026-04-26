import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ReactNode, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemePalette, useAppTheme, useThemedStyles } from '../theme';
import { dateInputValue, dateLabel } from '../utils/format';

type Option<T extends string> = {
  value: T;
  label: string;
};

function parseDateValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function Screen({
  children,
  onScroll,
  scrollEventThrottle,
  refreshing,
  onRefresh,
  stickyHeaderIndices,
}: {
  children: ReactNode;
  onScroll?: ScrollViewProps['onScroll'];
  scrollEventThrottle?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  stickyHeaderIndices?: number[];
}) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={[styles.screen, { paddingBottom: 18 + Math.max(insets.bottom - 6, 0) }]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle ?? 16}
      stickyHeaderIndices={stickyHeaderIndices}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function StickyBar({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.stickyBar}>{children}</View>;
}

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  action,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderCopy}>
        {eyebrow ? <Text style={styles.screenEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.screenHeaderAction}>{action}</View> : null}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.h2}>{title}</Text>
      {action}
    </View>
  );
}

export function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'income' | 'expense' | 'loan' | 'neutral';
}) {
  const styles = useThemedStyles(createStyles);
  const toneCardStyle = tone === 'income' ? styles.statIncome : tone === 'expense' ? styles.statExpense : tone === 'loan' ? styles.statLoan : undefined;
  const toneValueStyle =
    tone === 'income' ? styles.statValueIncome : tone === 'expense' ? styles.statValueExpense : tone === 'loan' ? styles.statValueLoan : undefined;

  return (
    <View style={[styles.stat, toneCardStyle]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, toneValueStyle]}>{value}</Text>
    </View>
  );
}

export function Row({
  title,
  subtitle,
  amount,
  danger,
  meta,
  caption,
}: {
  title: string;
  subtitle?: string;
  amount?: string;
  danger?: boolean;
  meta?: string[];
  caption?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const metaItems = useMemo(() => (meta ?? []).filter(Boolean), [meta]);

  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {metaItems.length ? (
          <View style={styles.rowMeta}>
            {metaItems.map((item) => (
              <Text key={`${title}-${item}`} style={styles.rowMetaText} numberOfLines={1}>
                {item}
              </Text>
            ))}
          </View>
        ) : null}

        {caption ? (
          <Text style={styles.rowCaption}>{caption}</Text>
        ) : subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {amount ? <Text style={[styles.rowAmount, danger ? styles.rowAmountDanger : styles.rowAmountPositive]}>{amount}</Text> : null}
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();

  return (
    <View style={styles.emptyState}>
      <Ionicons name="sparkles-outline" size={18} color={palette.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function LoadingBlock({ label = 'Loading...' }: { label?: string }) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();

  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator size="small" color={palette.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function LoadingFooter({ visible }: { visible: boolean }) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.loadingFooter}>
      <ActivityIndicator size="small" color={palette.primary} />
      <Text style={styles.loadingFooterText}>Loading more...</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  ghost,
  compact,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  ghost?: boolean;
  compact?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      style={[styles.button, ghost && styles.ghost, compact && styles.buttonCompact, disabled && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.92}
      disabled={disabled}
    >
      {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
      <Text style={[styles.buttonText, ghost && styles.ghostText, compact && styles.buttonTextCompact]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'ghost',
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'ghost' | 'primary';
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();

  return (
    <TouchableOpacity
      style={[styles.iconButton, tone === 'primary' && styles.iconButtonPrimary, disabled && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color={tone === 'primary' ? '#ffffff' : palette.text} />
    </TouchableOpacity>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  numeric,
  secure,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  multiline,
  showPasswordToggle,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  showPasswordToggle?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        <TextInput
          style={[styles.input, styles.inputInsideWrap, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.placeholder}
          keyboardType={keyboardType ?? (numeric ? 'decimal-pad' : 'default')}
          secureTextEntry={secure ? !passwordVisible : false}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {secure && showPasswordToggle ? (
          <TouchableOpacity style={styles.inputIconButton} onPress={() => setPasswordVisible((current) => !current)} activeOpacity={0.8}>
            <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateValue(value));

  function openPicker() {
    setDraftDate(parseDateValue(value));
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
  }

  function applyDate(nextDate: Date) {
    setDraftDate(nextDate);
    onChange(dateInputValue(nextDate));
  }

  function onAndroidChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setOpen(false);
    if (event.type === 'set' && selectedDate) {
      applyDate(selectedDate);
    }
  }

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.dateButton} onPress={openPicker} activeOpacity={0.9}>
        <Text style={[styles.dateButtonText, !value && styles.dateButtonPlaceholder]}>
          {value ? dateLabel(value) : placeholder || 'Select date'}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={palette.muted} />
      </TouchableOpacity>

      {open && Platform.OS === 'android' ? <DateTimePicker value={draftDate} mode="date" display="default" onChange={onAndroidChange} /> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={closePicker}>
          <View style={styles.selectOverlay}>
            <View style={styles.selectSheet}>
              <Text style={styles.selectTitle}>{label ?? 'Select date'}</Text>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                onChange={(_, nextDate) => {
                  if (nextDate) {
                    setDraftDate(nextDate);
                  }
                }}
              />
              <View style={styles.dateActions}>
                <Button label="Cancel" ghost onPress={closePicker} />
                <Button
                  label="Done"
                  onPress={() => {
                    applyDate(draftDate);
                    closePicker();
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<Option<T>>;
  onChange: (value: T) => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.segment, value === option.value && styles.segmentActive]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.92}
        >
          <Text style={[styles.segmentText, value === option.value && styles.segmentTextActive]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.92}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: Array<Option<T>>;
  onChange: (value: T) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { palette } = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.value === value);

  return (
    <>
      <View style={styles.field}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TouchableOpacity style={styles.select} onPress={() => setOpen(true)} activeOpacity={0.92}>
          <Text style={styles.selectText}>{selected?.label ?? 'Select'}</Text>
          <Ionicons name="chevron-down" size={18} color={palette.muted} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.selectOverlay}>
          <View style={styles.selectSheet}>
            <Text style={styles.selectTitle}>{label ?? 'Select option'}</Text>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.selectItem, option.value === value && styles.selectItemActive]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                activeOpacity={0.92}
              >
                <Text style={[styles.selectItemText, option.value === value && styles.selectItemTextActive]}>{option.label}</Text>
                {option.value === value ? <Ionicons name="checkmark" size={18} color={palette.primary} /> : null}
              </TouchableOpacity>
            ))}
            <Button label="Close" ghost onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function Sheet({ visible, title, children, onClose }: { visible: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: 16 + Math.max(insets.bottom, 0) }]}>
          <SectionTitle title={title} action={<IconButton icon="close-outline" onPress={onClose} />} />
          <View style={styles.sheetBody}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    screenScroll: { flex: 1, backgroundColor: palette.bg },
    screen: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },
    stickyBar: {
      marginHorizontal: -16,
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 6,
      backgroundColor: palette.bg,
    },
    screenHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
    screenHeaderCopy: { flex: 1, gap: 4 },
    screenHeaderAction: { alignSelf: 'center' },
    screenEyebrow: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    screenTitle: { color: palette.text, fontSize: 22, lineHeight: 26, fontWeight: '800' },
    screenSubtitle: { color: palette.muted, fontSize: 11, lineHeight: 15 },
    card: {
      backgroundColor: palette.surface,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 3,
    },
    sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
    h2: { color: palette.text, fontSize: 14, fontWeight: '800' },
    stat: {
      flex: 1,
      minWidth: '47%',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    statIncome: { backgroundColor: palette.successSoft, borderColor: palette.successSoft },
    statExpense: { backgroundColor: palette.dangerSoft, borderColor: palette.dangerSoft },
    statLoan: { backgroundColor: palette.loanSoft, borderColor: palette.loanSoft },
    statLabel: { color: palette.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
    statValue: { marginTop: 6, color: palette.text, fontSize: 16, fontWeight: '800' },
    statValueIncome: { color: palette.success },
    statValueExpense: { color: palette.danger },
    statValueLoan: { color: palette.loan },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.rowBorder,
    },
    rowCopy: { flex: 1, gap: 3 },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    rowTitle: { color: palette.text, fontWeight: '700', fontSize: 13, lineHeight: 17 },
    rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rowMetaText: { color: palette.primary, fontSize: 10, fontWeight: '600' },
    rowSubtitle: { color: palette.muted, fontSize: 10, lineHeight: 14 },
    rowCaption: { color: palette.muted, fontSize: 10, lineHeight: 14 },
    rowAmount: { marginTop: 1, fontSize: 12, fontWeight: '800' },
    rowAmountPositive: { color: palette.success },
    rowAmountDanger: { color: palette.danger },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 14,
      paddingHorizontal: 10,
    },
    emptyTitle: { color: palette.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    emptySubtitle: { color: palette.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
    loadingBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 88,
    },
    loadingText: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    loadingFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 10,
    },
    loadingFooterText: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '700',
    },
    button: {
      minHeight: 36,
      borderRadius: 10,
      backgroundColor: palette.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
    },
    buttonIcon: { alignItems: 'center', justifyContent: 'center' },
    buttonCompact: {
      minHeight: 30,
      borderRadius: 9,
      paddingHorizontal: 10,
    },
    buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
    buttonTextCompact: { fontSize: 11 },
    iconButton: {
      width: 34,
      minHeight: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.border,
    },
    iconButtonPrimary: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    ghost: {
      backgroundColor: palette.surfaceMuted,
    },
    buttonDisabled: {
      opacity: 0.56,
    },
    ghostText: { color: palette.text },
    field: { gap: 4, marginBottom: 8 },
    label: { color: palette.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
    input: {
      minHeight: 38,
      color: palette.text,
      fontSize: 12,
    },
    inputWrap: {
      minHeight: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
      paddingLeft: 10,
      paddingRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputWrapMultiline: {
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingBottom: 12,
    },
    inputInsideWrap: {
      flex: 1,
    },
    inputMultiline: {
      minHeight: 92,
    },
    inputIconButton: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateButton: {
      minHeight: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateButtonText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '600',
    },
    dateButtonPlaceholder: {
      color: palette.placeholder,
      fontWeight: '500',
    },
    select: {
      minHeight: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectText: { color: palette.text, fontSize: 12, fontWeight: '600' },
    segmented: {
      flexDirection: 'row',
      backgroundColor: palette.surfaceMuted,
      borderRadius: 10,
      padding: 2,
    },
    segment: { flex: 1, minHeight: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    segmentActive: {
      backgroundColor: palette.surface,
    },
    segmentText: { color: palette.muted, fontWeight: '700', fontSize: 11 },
    segmentTextActive: { color: palette.text },
    chip: {
      paddingHorizontal: 9,
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      justifyContent: 'center',
      marginRight: 6,
      marginBottom: 5,
      backgroundColor: palette.surface,
    },
    chipActive: { backgroundColor: palette.primarySoft, borderColor: palette.primarySoft },
    chipText: { color: palette.muted, fontWeight: '700', fontSize: 10 },
    chipTextActive: { color: palette.primary },
    overlay: { flex: 1, backgroundColor: palette.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: palette.bg,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 12,
      paddingTop: 12,
      maxHeight: '90%',
    },
    sheetBody: { paddingTop: 6 },
    selectOverlay: {
      flex: 1,
      backgroundColor: palette.overlay,
      justifyContent: 'center',
      padding: 20,
    },
    selectSheet: {
      backgroundColor: palette.surface,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 8,
    },
    selectTitle: { color: palette.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
    dateActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    selectItem: {
      minHeight: 38,
      borderRadius: 10,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.surface,
    },
    selectItemActive: {
      backgroundColor: palette.primarySoft,
    },
    selectItemText: { color: palette.text, fontSize: 12, fontWeight: '600' },
    selectItemTextActive: { color: palette.primary },
  });
