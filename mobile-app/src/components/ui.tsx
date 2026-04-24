import { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function Screen({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={styles.screen}>{children}</ScrollView>;
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
    <View style={[styles.stat, tone === 'income' && styles.income, tone === 'expense' && styles.expense, tone === 'loan' && styles.loan]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function Row({ title, subtitle, amount, danger }: { title: string; subtitle?: string; amount?: string; danger?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {amount ? <Text style={[styles.amount, danger && styles.amountDanger]}>{amount}</Text> : null}
    </View>
  );
}

export function Button({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <TouchableOpacity style={[styles.button, ghost && styles.ghost]} onPress={onPress}>
      <Text style={[styles.buttonText, ghost && styles.ghostText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Field({ label, value, onChangeText, placeholder, numeric }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; numeric?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
      />
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <TouchableOpacity key={option.value} style={[styles.segment, value === option.value && styles.segmentActive]} onPress={() => onChange(option.value)}>
          <Text style={[styles.segmentText, value === option.value && styles.segmentTextActive]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Sheet({ visible, title, children, onClose }: { visible: boolean; title: string; children: ReactNode; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <SectionTitle title={title} action={<Button label="Close" ghost onPress={onClose} />} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 28, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#dce5ef' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  h2: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  stat: { flex: 1, minWidth: '47%', borderRadius: 16, padding: 14, backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#94a3b8' },
  income: { borderLeftColor: '#1f9d73' },
  expense: { borderLeftColor: '#d85c4a' },
  loan: { borderLeftColor: '#8b5cf6' },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  statValue: { marginTop: 8, color: '#0f172a', fontSize: 19, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  rowTitle: { color: '#0f172a', fontWeight: '800' },
  rowSub: { marginTop: 3, color: '#64748b', fontSize: 12 },
  amount: { color: '#1f9d73', fontWeight: '900' },
  amountDanger: { color: '#d85c4a' },
  button: { minHeight: 38, borderRadius: 12, backgroundColor: '#0f6b8d', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonText: { color: '#fff', fontWeight: '800' },
  ghost: { backgroundColor: '#edf2f7' },
  ghostText: { color: '#0f172a' },
  field: { gap: 6, marginBottom: 10 },
  label: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#d8e0ea', backgroundColor: '#fff', paddingHorizontal: 12 },
  segmented: { flexDirection: 'row', backgroundColor: '#e8eef5', borderRadius: 14, padding: 4 },
  segment: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: '#0f6b8d' },
  segmentText: { color: '#64748b', fontWeight: '800' },
  segmentTextActive: { color: '#fff' },
  chip: { paddingHorizontal: 12, minHeight: 34, borderRadius: 999, borderWidth: 1, borderColor: '#d8e0ea', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#0f6b8d', borderColor: '#0f6b8d' },
  chipText: { color: '#64748b', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#f5f7fb', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, maxHeight: '88%' },
});
