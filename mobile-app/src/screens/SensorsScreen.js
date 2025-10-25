import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { palette } from "../theme/colors";
import { SENSOR_LIST } from "../services/sensorConfig";
import { SensorCard } from "../components/SensorCard";
import { useSensorData } from "../hooks/useSensorData";

const formatValue = (value) => {
  if (value === null || value === undefined) return "--";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : value.toFixed(1);
  }
  return value;
};

const SensorsScreen = ({ navigation }) => {
  const { latest } = useSensorData();

  const data = useMemo(
    () =>
      SENSOR_LIST.map((item) => {
        const metric = item.metrics[0];
        return {
          ...item,
          value: latest ? latest[metric.key] : null,
          unit: metric.unit,
          color: metric.color,
        };
      }),
    [latest]
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(sensor) => sensor.key}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Danh sách cảm biến</Text>
          <Text style={styles.subtitle}>
            Chọn cảm biến để xem chi tiết và điều khiển thiết bị liên quan.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <SensorCard
          title={item.name}
          subtitle={item.description}
          value={formatValue(item.value)}
          unit={item.unit}
          icon={item.icon}
          color={item.color}
          onPress={() =>
            navigation.navigate("SensorDetail", { sensorKey: item.key })
          }
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: palette.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: palette.textSecondary,
  },
});

export default SensorsScreen;
