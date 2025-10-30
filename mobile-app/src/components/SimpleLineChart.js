import React, { useMemo } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { palette } from "../theme/colors";

const chartWidth = Dimensions.get("window").width - 40;

// Cấu hình giới hạn cố định cho từng loại cảm biến
const SENSOR_LIMITS = {
  nhietdo: { min: -10, max: 100 },     // Nhiệt độ: 0°C đến 50°C (phù hợp với môi trường nhà kính)
  doam: { min: 0, max: 100 },       // Độ ẩm không khí: 0% đến 100%
  doamdatPercent: { min: 0, max: 100 }, // Độ ẩm đất: 0% đến 100%
  anhsang: { min: 0, max: 10000 },   // Ánh sáng: 0 đến 4000 lux (phù hợp theo thang đo thực tế)
  khigas: { min: 0, max: 10000 },    // Khí gas: 0 đến 4000 ppm (phù hợp với MQ2)
  khoangcach: { min: 0, max: 400 },  // Khoảng cách nước: 0 đến 50 cm (phù hợp với bể nước)
  mua: { min: 0, max: 100 }          // Mưa: 0 đến 10 mm/h
};

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
  const rawValues = points.map((item) => Number(item[metricKey]) || 0);

  // Thêm giá trị min và max từ cấu hình cố định
  const sensorLimits = SENSOR_LIMITS[metricKey] || { min: Math.min(...rawValues), max: Math.max(...rawValues) };

  // Nếu là cảm biến mưa, chuyển giá trị 0/1 -> 0 hoặc một giá trị ngẫu nhiên mm/h (hiển thị)
  const values = rawValues.map((v) => {
    if (metricKey === "mua") {
      // v === 1 => có mưa
      return v ? Number((Math.random() * (sensorLimits.max - 0.1) + 0.1).toFixed(1)) : 0;
    }
    return v;
  });

  // Tạo dataset chính và hai dataset ẩn (min/max) để ép thang Y cố định
  const hiddenMin = values.map(() => sensorLimits.min);
  const hiddenMax = values.map(() => sensorLimits.max);

  const datasets = [
    {
      data: values,
      color: () => palette.primary,
      strokeWidth: 3,
    },
    // ẩn dataset cho min
    {
      data: hiddenMin,
      color: () => "transparent",
      strokeWidth: 0,
      withDots: false,
    },
    // ẩn dataset cho max
    {
      data: hiddenMax,
      color: () => "transparent",
      strokeWidth: 0,
      withDots: false,
    },
  ];

  return {
    labels,
    datasets,
  // We render the title above the chart ourselves, so disable the built-in legend
  legend: undefined,
    // Thêm giới hạn min và max (dự phòng)
    yMin: sensorLimits.min,
    yMax: sensorLimits.max,
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
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={true}
        withHorizontalLines={true}
        fromZero={false}
        yAxisInterval={5}
        yMin={chartData.yMin}
        yMax={chartData.yMax}
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
