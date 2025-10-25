import React from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette } from "../theme/colors";

const ICON_PACKS = {
  Feather,
  MaterialCommunityIcons,
};

const getIconComponent = (pack) => ICON_PACKS[pack] || Feather;

export const SensorCard = ({
  title,
  value,
  unit,
  subtitle,
  icon = { pack: "Feather", name: "activity" },
  color = palette.primary,
  onPress,
}) => {
  const IconComponent = getIconComponent(icon.pack);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, { borderColor: color }]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: `${color}20` }]}>
        <IconComponent name={icon.name} size={26} color={color} />
      </View>
      <View style={styles.textWrapper}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.valueWrapper}>
        <Text style={[styles.value, { color }]}>{value ?? "--"}</Text>
        {unit ? <Text style={[styles.unit, { color }]}>{unit}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: palette.card,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  valueWrapper: {
    alignItems: "flex-end",
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
  },
  unit: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.85,
  },
});

export default SensorCard;
