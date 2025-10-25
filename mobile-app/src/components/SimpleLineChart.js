import React, { useMemo } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { palette } from "../theme/colors";

const chartWidth = Dimensions.get("window").width - 40;

const buildChartData = (title, metricKey, data) => {
  const points = data.slice().reverse();
  const labels = points.map((item) => {
    if (!item.timestamp) return "";
    const date = new Date(item.timestamp);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  });
  const values = points.map((item) => Number(item[metricKey]) || 0);

  return {
    labels,
    datasets: [
      {
        data: values,
        color: () => palette.primary,
        strokeWidth: 3,
      },
    ],
    legend: title ? [title] : undefined,
  };
};

const chartConfig = (color) => ({
  backgroundColor: palette.card,
  backgroundGradientFrom: palette.card,
  backgroundGradientTo: palette.card,
  decimalPlaces: 1,
  color: (opacity = 1) => `${color}${Math.floor(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`,
  labelColor: () => palette.textSecondary,
  propsForDots: {
    r: "3",
    strokeWidth: "2",
    stroke: color,
  },
  propsForBackgroundLines: {
    stroke: `${palette.border}80`,
  },
});

const SimpleLineChart = ({ title, metricKey, color = palette.primary, data }) => {
  const chartData = useMemo(
    () => buildChartData(title, metricKey, data || []),
    [title, metricKey, data]
  );

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>Chưa có dữ liệu hiển thị.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <LineChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig(color)}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: palette.card,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chart: {
    marginTop: 12,
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
    textAlign: "center",
  },
  emptyState: {
    backgroundColor: palette.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
});

export default SimpleLineChart;
