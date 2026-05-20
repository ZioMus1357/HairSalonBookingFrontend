import { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors, radii, shadow } from "../theme/tokens";

export function PageHeader({ kicker, title, subtitle, image }: { kicker?: string; title: string; subtitle?: string; image?: string }) {
  const { width } = useWindowDimensions();
  const compact = width < 620;
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={styles.headerCopy}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {image ? <Image source={{ uri: image }} style={[styles.headerImage, compact && styles.headerImageCompact]} /> : null}
    </View>
  );
}

export function Card({ children, selected }: { children: ReactNode; selected?: boolean }) {
  return <View style={[styles.card, selected && styles.selected]}>{children}</View>;
}

export function Button({ label, onPress, icon, variant = "gold", disabled }: { label: string; onPress: () => void; icon?: ReactNode; variant?: "gold" | "dark" | "ghost" | "light"; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, styles[`${variant}Button`], disabled && styles.disabled, pressed && styles.pressed]}>
      {icon}
      <Text style={[styles.buttonText, variant === "dark" && styles.darkButtonText, variant === "ghost" && styles.ghostButtonText, variant === "light" && styles.lightButtonText]}>{label}</Text>
      <ChevronRight size={16} color={variant === "gold" || variant === "light" ? colors.ink : colors.champagne} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress, disabled }: { label: string; active?: boolean; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || !onPress} style={[styles.chip, active && styles.chipActive, disabled && styles.disabled]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} multiline={multiline} keyboardType={keyboardType} placeholderTextColor="rgba(40,39,37,0.42)" style={[styles.input, multiline && styles.multiline]} />
    </View>
  );
}

export function SelectRail({ label, value, options, onChange }: { label: string; value?: string; options: { label: string; value: string; disabled?: boolean }[]; onChange: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {options.length === 0 ? <Text style={styles.emptySmall}>Brak danych</Text> : null}
        {options.map((option) => (
          <Chip key={option.value} label={option.label} active={value === option.value} disabled={option.disabled} onPress={() => onChange(option.value)} />
        ))}
      </ScrollView>
    </View>
  );
}

export function StateView({ loading, error, empty, children }: { loading?: boolean; error?: string; empty?: boolean; children: ReactNode }) {
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.gold} />
        <Text style={styles.stateText}>Ładowanie danych...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>Nie udało się pobrać danych</Text>
        <Text style={styles.stateText}>{error}</Text>
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>Brak danych</Text>
        <Text style={styles.stateText}>Dodaj pierwszy rekord albo odśwież dane.</Text>
      </View>
    );
  }
  return <>{children}</>;
}

export function DataTable<T extends { id: string }>({ items, columns, actions }: { items: T[]; columns: { title: string; render: (item: T) => string }[]; actions?: (item: T) => ReactNode }) {
  return (
    <View style={styles.table}>
      {items.map((item) => (
        <View key={item.id} style={styles.tableRow}>
          {columns.map((column) => (
            <View key={column.title} style={styles.tableCell}>
              <Text style={styles.tableLabel}>{column.title}</Text>
              <Text style={styles.tableValue}>{column.render(item)}</Text>
            </View>
          ))}
          {actions ? <View style={styles.tableActions}>{actions(item)}</View> : null}
        </View>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: 22,
    minHeight: 220,
    overflow: "hidden",
    flexDirection: "row",
    gap: 20,
    alignItems: "center"
  },
  headerCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    padding: 18,
    minHeight: 0
  },
  headerCopy: {
    flex: 1,
    minWidth: 240
  },
  kicker: {
    color: colors.champagne,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0
  },
  title: {
    color: colors.pearl,
    fontSize: 42,
    lineHeight: 47,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 8
  },
  titleCompact: {
    fontSize: 32,
    lineHeight: 37
  },
  subtitle: {
    color: "rgba(251,250,247,0.78)",
    fontSize: 16,
    lineHeight: 25,
    marginTop: 12,
    maxWidth: 720
  },
  headerImage: {
    width: 300,
    height: 190,
    borderRadius: radii.lg
  },
  headerImageCompact: {
    width: "100%",
    height: 180
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  selected: {
    borderColor: colors.gold,
    backgroundColor: "#fffaf0"
  },
  button: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  goldButton: {
    backgroundColor: colors.champagne
  },
  darkButton: {
    backgroundColor: colors.ink
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line
  },
  lightButton: {
    backgroundColor: "rgba(251,250,247,0.92)",
    borderWidth: 1,
    borderColor: "rgba(251,250,247,0.5)"
  },
  buttonText: {
    color: colors.ink,
    fontWeight: "900"
  },
  darkButtonText: {
    color: colors.pearl
  },
  ghostButtonText: {
    color: colors.ink
  },
  lightButtonText: {
    color: colors.ink
  },
  disabled: {
    opacity: 0.44
  },
  pressed: {
    opacity: 0.72
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pearl,
    paddingHorizontal: 13,
    paddingVertical: 10
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  chipText: {
    color: colors.charcoal,
    fontWeight: "800"
  },
  chipTextActive: {
    color: colors.champagne
  },
  field: {
    gap: 7,
    marginBottom: 12
  },
  label: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pearl,
    paddingHorizontal: 13,
    color: colors.ink,
    fontSize: 15
  },
  multiline: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  rail: {
    gap: 8,
    paddingRight: 8
  },
  state: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fff",
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  stateText: {
    color: colors.ash,
    marginTop: 8,
    textAlign: "center"
  },
  emptySmall: {
    color: colors.ash,
    paddingVertical: 10
  },
  table: {
    gap: 10
  },
  tableRow: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pearl,
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center"
  },
  tableCell: {
    flex: 1,
    minWidth: 150
  },
  tableLabel: {
    color: colors.ash,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  tableValue: {
    color: colors.ink,
    fontWeight: "800",
    marginTop: 4
  },
  tableActions: {
    flexDirection: "row",
    gap: 8
  }
});
