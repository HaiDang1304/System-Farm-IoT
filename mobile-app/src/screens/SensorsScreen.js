import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { palette } from "../theme/colors";
import { SENSOR_LIST } from "../services/sensorConfig";
import SimpleLineChart from "../components/SimpleLineChart";
import { useSensorData } from "../hooks/useSensorData";

const numberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  const absolute = Math.abs(value);
  if (absolute >= 100) return value.toFixed(0);
  if (absolute >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

const formatDelta = (value, unit) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  const absolute = Math.abs(value);
  const formatted = absolute >= 1 ? absolute.toFixed(1) : absolute.toFixed(2);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatted} ${unit}`;
};

const SensorsScreen = () => {
  const { data, latest, loading, error, refresh } = useSensorData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const metricConfigs = useMemo(
    () =>
      SENSOR_LIST.flatMap((sensor) =>
        sensor.metrics.map((metric) => ({
          ...metric,
          sensorKey: sensor.key,
          sensorName: sensor.name,
          sensorDescription: sensor.description,
        }))
      ),
    []
  );

  const metricStats = useMemo(() => {
    return metricConfigs.map((metric) => {
      const series = data
        .map((entry) => numberOrNull(entry?.[metric.key]))
        .filter((value) => value !== null);

      const latestValue = numberOrNull(latest?.[metric.key]);
      const previousValue =
        data.length > 1 ? numberOrNull(data[1]?.[metric.key]) : null;

      const average =
        series.length > 0
          ? series.reduce((total, value) => total + value, 0) / series.length
          : null;

      const min = series.length > 0 ? Math.min(...series) : null;
      const max = series.length > 0 ? Math.max(...series) : null;
      const delta =
        latestValue !== null && previousValue !== null
          ? latestValue - previousValue
          : null;

      return {
        metric,
        stats: {
          latest: latestValue,
          average,
          min,
          max,
          delta,
        },
      };
    });
  }, [metricConfigs, data, latest]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Thống kê tổng quan</Text>
        <Text style={styles.subtitle}>
          Theo dõi xu hướng dữ liệu cảm biến theo thời gian.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        {metricStats.map(({ metric, stats }) => (
          <View key={metric.key} style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryHeading}>
                <Text style={styles.summaryLabel}>{metric.label}</Text>
                <Text style={styles.summarySensor}>{metric.sensorName}</Text>
              </View>
              <Text style={[styles.summaryValue, { color: metric.color }]}>
                {formatNumber(stats.latest)} {metric.unit}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryMeta}>Trung bình</Text>
              <Text style={styles.summaryMetaValue}>
                {formatNumber(stats.average)} {metric.unit}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryMeta}>Cao nhất</Text>
              <Text style={styles.summaryMetaValue}>
                {formatNumber(stats.max)} {metric.unit}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryMeta}>Thấp nhất</Text>
              <Text style={styles.summaryMetaValue}>
                {formatNumber(stats.min)} {metric.unit}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryMeta}>Thay đổi gần nhất</Text>
              <Text
                style={[
                  styles.summaryMetaValue,
                  stats.delta === null
                    ? null
                    : stats.delta > 0
                    ? styles.deltaPositive
                    : stats.delta < 0
                    ? styles.deltaNegative
                    : styles.deltaNeutral,
                ]}
              >
                {formatDelta(stats.delta, metric.unit)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Biểu đồ thời gian</Text>
        {SENSOR_LIST.map((sensor) => (
          <View key={sensor.key} style={styles.sensorBlock}>
            <Text style={styles.sensorName}>{sensor.name}</Text>
            <Text style={styles.sensorDescription}>{sensor.description}</Text>
            {sensor.metrics.map((metric) => (
              <SimpleLineChart
                key={metric.key}
                data={data}
                metricKey={metric.key}
                color={metric.color}
                title={`${metric.label} (${metric.unit})`}
              />
            ))}
          </View>
        ))}
      </View>

      {loading ? (
        <Text style={styles.loadingHint}>Đang cập nhật dữ liệu...</Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.danger,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  summaryGrid: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  summaryHeading: {
    flex: 1,
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  summarySensor: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  summaryRowLast: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: `${palette.border}80`,
    marginTop: 6,
  },
  summaryMeta: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  summaryMetaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  deltaPositive: {
    color: "#16a34a",
  },
  deltaNegative: {
    color: "#dc2626",
  },
  deltaNeutral: {
    color: palette.textSecondary,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  sensorBlock: {
    marginTop: 12,
  },
  sensorName: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  sensorDescription: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },
  loadingHint: {
    marginTop: 20,
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: "center",
  },
});

export default SensorsScreen;
