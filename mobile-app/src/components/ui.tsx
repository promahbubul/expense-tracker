import { ReactNode } from 'react';
import { KeyboardTypeOptions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
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
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.h2}>{title}</Text>
      {action}
    </View>
  );
}

export function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'income' | 'expense' | 'loan' | 'neutral' }) {
  return (
    <View style={[styles.stat, tone === 'income' && styles.statIncome, tone === 'expense' && styles.statExpense, tone === 'loan' && styles.statLoan]}>
      <View style={styles.statTop}>
        <View style={[styles.statDot, tone === 'income' && styles.statDotIncome, tone === 'expense' && styles.statDotExpense, tone === 'loan' && styles.statDotLoan]} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function Row({ title, subtitle, amount, danger }: { title: string; subtitle?: string; amount?: string; danger?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowAccent, danger && styles.rowAccentDanger]} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {amount ? (
        <View style={[styles.amountBadge, danger && styles.amountBadgeDanger]}>
          <Text style={[styles.amount, danger && styles.amountDanger]}>{amount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  ghost,
  compact,
  disabled,
}: {
  label: string;
  onPress: () => void;
  ghost?: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, ghost && styles.ghost, compact && styles.buttonCompact, disabled && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, ghost && styles.ghostText, compact && styles.buttonTextCompact]}>{label}</Text>
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8f867b"
        keyboardType={keyboardType ?? (numeric ? 'decimal-pad' : 'default')}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
      />
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <TouchableOpacity key={option.value} style={[styles.segment, value === option.value && styles.segmentActive]} onPress={() => onChange(option.value)} activeOpacity={0.9}>
          <Text style={[styles.segmentText, value === option.value && styles.segmentTextActive]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.9}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Sheet({ visible, title, children, onClose }: { visible: boolean; title: string; children: ReactNode; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <SectionTitle title={title} action={<Button label="Close" ghost compact onPress={onClose} />} />
          <View style={styles.sheetBody}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenScroll: { flex: 1 },
  screen: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, gap: 16 },
  screenHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  screenHeaderCopy: { flex: 1, gap: 4 },
  screenHeaderAction: { alignSelf: 'center' },
  screenEyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 93, 84, 0.08)',
    color: '#165d54',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  screenTitle: { color: '#19231f', fontSize: 28, lineHeight: 32, fontWeight: '900' },
  screenSubtitle: { color: '#6f6a60', fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: 'rgba(255, 252, 246, 0.97)',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(82, 66, 46, 0.10)',
    shadowColor: '#21160d',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  h2: { color: '#19231f', fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  stat: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 24,
    padding: 17,
    backgroundColor: 'rgba(255, 252, 246, 0.97)',
    borderWidth: 1,
    borderColor: 'rgba(82, 66, 46, 0.10)',
    shadowColor: '#21160d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 3,
  },
  statIncome: { backgroundColor: 'rgba(232, 246, 239, 0.98)' },
  statExpense: { backgroundColor: 'rgba(252, 239, 235, 0.98)' },
  statLoan: { backgroundColor: 'rgba(236, 242, 252, 0.98)' },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statDot: { width: 9, height: 9, borderRadius: 999, backgroundColor: '#a8a198' },
  statDotIncome: { backgroundColor: '#1f9b72' },
  statDotExpense: { backgroundColor: '#dc5b4e' },
  statDotLoan: { backgroundColor: '#3d6fb8' },
  statLabel: { color: '#6d685e', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  statValue: { marginTop: 14, color: '#19231f', fontSize: 22, fontWeight: '900' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(82, 66, 46, 0.08)',
  },
  rowAccent: {
    width: 4,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 93, 84, 0.16)',
  },
  rowAccentDanger: { backgroundColor: 'rgba(220, 91, 78, 0.20)' },
  rowBody: { flex: 1 },
  rowTitle: { color: '#19231f', fontWeight: '900', fontSize: 15 },
  rowSub: { marginTop: 4, color: '#6f6a60', fontSize: 12 },
  amountBadge: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(31, 155, 114, 0.10)',
  },
  amountBadgeDanger: { backgroundColor: 'rgba(220, 91, 78, 0.10)' },
  amount: { color: '#1f9b72', fontWeight: '900' },
  amountDanger: { color: '#dc5b4e' },
  emptyState: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(243, 236, 225, 0.65)',
  },
  emptyTitle: { color: '#19231f', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptySubtitle: { marginTop: 6, color: '#6f6a60', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  button: {
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: '#165d54',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#0f342f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  buttonCompact: {
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  buttonTextCompact: { fontSize: 13 },
  ghost: {
    backgroundColor: '#efe6d8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabled: {
    opacity: 0.56,
  },
  ghostText: { color: '#1f2430' },
  field: { gap: 7, marginBottom: 14 },
  label: { color: '#6d685e', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(82, 66, 46, 0.10)',
    backgroundColor: '#fffefb',
    paddingHorizontal: 15,
    color: '#19231f',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(232, 222, 206, 0.92)',
    borderRadius: 22,
    padding: 5,
  },
  segment: { flex: 1, minHeight: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  segmentActive: {
    backgroundColor: '#fffdfa',
    shadowColor: '#24180f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  segmentText: { color: '#6f6a60', fontWeight: '800' },
  segmentTextActive: { color: '#19231f' },
  chip: {
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(82, 66, 46, 0.10)',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fffdf8',
  },
  chipActive: { backgroundColor: '#165d54', borderColor: '#165d54' },
  chipText: { color: '#6f6a60', fontWeight: '800' },
  chipTextActive: { color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(14, 21, 27, 0.34)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#f4efe6',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 18,
    maxHeight: '90%',
  },
  sheetBody: { paddingTop: 6 },
});
