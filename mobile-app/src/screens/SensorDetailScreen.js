import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { palette } from "../theme/colors";
import { SENSOR_CONFIG } from "../services/sensorConfig";
import { useSensorData } from "../hooks/useSensorData";
import SimpleLineChart from "../components/SimpleLineChart";
import { sendControlCommand, sendThresholdValue } from "../services/api";

const buildInitialControlState = (controls = []) =>
  controls.reduce((acc, control) => {
    if (control.type === "toggle") {
      acc[control.device] = false;
    }
    if (control.type === "threshold") {
      acc[control.device] = "";
    }
    return acc;
  }, {});

const formatMetricValue = (value) => {
  if (value === null || value === undefined) return "--";
  if (typeof value === "number") {
    if (Math.abs(value) >= 100) return value.toFixed(0);
    return value.toFixed(1);
  }
  return value;
};

const SensorDetailScreen = ({ route, navigation }) => {
  const { sensorKey } = route.params;
  const config = SENSOR_CONFIG[sensorKey];
  const { data, latest, loading } = useSensorData();
  const [controlState, setControlState] = useState(
    buildInitialControlState(config?.controls)
  );
  const [thresholdInputs, setThresholdInputs] = useState(
    buildInitialControlState(config?.controls)
  );
  const [busyDevice, setBusyDevice] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: config?.name ?? "Chi tiết cảm biến" });
  }, [config?.name, navigation]);

  if (!config) {
    return (
      <View style={styles.missingWrapper}>
        <Text style={styles.missingTitle}>Không tìm thấy cảm biến</Text>
        <Text style={styles.missingSubtitle}>
          Vui lòng quay lại và chọn một cảm biến hợp lệ.
        </Text>
      </View>
    );
  }

  const latestEntry = latest || {};

  const handleToggle = async (device, currentValue, label) => {
    try {
      setBusyDevice(device);
      const nextState = !currentValue;
      await sendControlCommand({
        device,
        action: nextState ? "ON" : "OFF",
      });
      setControlState((prev) => ({ ...prev, [device]: nextState }));
      Alert.alert(
        "Đã gửi lệnh",
        `${label || "Thiết bị"} đang được ${nextState ? "bật" : "tắt"}.`
      );
    } catch (error) {
      Alert.alert("Gửi lệnh thất bại", error.message);
    } finally {
      setBusyDevice(null);
    }
  };

  const handleThresholdSubmit = async (device, value, label) => {
    if (!value && value !== 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập giá trị ngưỡng.");
      return;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      Alert.alert("Giá trị không hợp lệ", "Vui lòng nhập số hợp lệ.");
      return;
    }

    try {
      setBusyDevice(device);
      await sendThresholdValue(device, numeric);
      setThresholdInputs((prev) => ({ ...prev, [device]: "" }));
      Alert.alert("Cập nhật thành công", `${label} đã được gửi lên hệ thống.`);
    } catch (error) {
      Alert.alert("Cập nhật thất bại", error.message);
    } finally {
      setBusyDevice(null);
    }
  };

  const timestampText = useMemo(() => {
    if (!latestEntry.timestamp) return "Chưa có dữ liệu gần đây.";
    const dt = new Date(latestEntry.timestamp);
    return `Cập nhật lần cuối: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
  }, [latestEntry.timestamp]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{config.name}</Text>
        <Text style={styles.description}>{config.description}</Text>
        <Text style={styles.timestamp}>{timestampText}</Text>
      </View>

      <View style={styles.metricGrid}>
        {config.metrics.map((metric) => (
          <View
            key={metric.key}
            style={[
              styles.metricCard,
              { borderColor: `${metric.color}40` },
            ]}
          >
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={[styles.metricValue, { color: metric.color }]}>
              {formatMetricValue(latestEntry[metric.key])}
              {metric.unit ? (
                <Text style={styles.metricUnit}> {metric.unit}</Text>
              ) : null}
            </Text>
          </View>
        ))}
      </View>

      {config.metrics.map((metric) => (
        <SimpleLineChart
          key={`${metric.key}-chart`}
          data={data}
          metricKey={metric.key}
          color={metric.color}
          title={`Xu hướng ${metric.label.toLowerCase()}`}
        />
      ))}

      {config.controls?.length ? (
        <View style={styles.controlsWrapper}>
          <Text style={styles.sectionTitle}>Điều khiển thiết bị</Text>
          {config.controls.map((control) => {
            if (control.type === "toggle") {
              const isActive = controlState[control.device] ?? false;
              return (
                <View key={control.device} style={styles.toggleCard}>
                  <View style={styles.toggleTextWrapper}>
                    <Text style={styles.toggleLabel}>{control.label}</Text>
                    <Text style={styles.toggleDescription}>
                      {control.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      isActive ? styles.toggleButtonActive : null,
                      busyDevice === control.device
                        ? styles.toggleButtonBusy
                        : null,
                    ]}
                    onPress={() =>
                      handleToggle(
                        control.device,
                        isActive,
                        control.label || "Thiết bị"
                      )
                    }
                    disabled={busyDevice === control.device}
                  >
                    <Text
                      style={[
                        styles.toggleButtonLabel,
                        isActive ? styles.toggleButtonLabelActive : null,
                      ]}
                    >
                      {isActive ? "Đang bật" : "Đang tắt"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            if (control.type === "threshold") {
              const rawValue = thresholdInputs[control.device];
              const inputValue = rawValue === undefined ? "" : String(rawValue);
              return (
                <View key={control.device} style={styles.thresholdCard}>
                  <Text style={styles.thresholdLabel}>{control.label}</Text>
                  <Text style={styles.thresholdDescription}>
                    Nhập giá trị mới để gửi xuống thiết bị.
                  </Text>
                  <View style={styles.thresholdRow}>
                    <TextInput
                      value={String(inputValue)}
                      onChangeText={(text) =>
                        setThresholdInputs((prev) => ({
                          ...prev,
                          [control.device]: text,
                        }))
                      }
                      placeholder={control.placeholder}
                      keyboardType="numeric"
                      style={styles.thresholdInput}
                    />
                    <TouchableOpacity
                      style={[
                        styles.thresholdButton,
                        busyDevice === control.device
                          ? styles.thresholdButtonDisabled
                          : null,
                      ]}
                      onPress={() =>
                        handleThresholdSubmit(
                          control.device,
                          inputValue,
                          control.label
                        )
                      }
                      disabled={busyDevice === control.device}
                    >
                      <Text style={styles.thresholdButtonLabel}>Gửi</Text>
                    </TouchableOpacity>
                  </View>
                  {control.unit ? (
                    <Text style={styles.thresholdHint}>
                      Đơn vị: {control.unit}
                    </Text>
                  ) : null}
                </View>
              );
            }

            return null;
          })}
        </View>
      ) : null}

      {loading ? (
        <Text style={styles.loadingHint}>Đang cập nhật dữ liệu gần nhất...</Text>
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
    paddingBottom: 36,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  description: {
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: 6,
  },
  timestamp: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 8,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flexBasis: "48%",
    minWidth: 160,
    backgroundColor: palette.card,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 6,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  controlsWrapper: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.textPrimary,
    marginBottom: 12,
  },
  toggleCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  toggleTextWrapper: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  toggleButtonActive: {
    backgroundColor: `${palette.primary}15`,
    borderColor: palette.primary,
  },
  toggleButtonBusy: {
    opacity: 0.6,
  },
  toggleButtonLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  toggleButtonLabelActive: {
    color: palette.primary,
  },
  thresholdCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 12,
  },
  thresholdLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  thresholdDescription: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 4,
  },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  thresholdInput: {
    flex: 1,
    backgroundColor: palette.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: palette.textPrimary,
  },
  thresholdButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  thresholdButtonDisabled: {
    opacity: 0.7,
  },
  thresholdButtonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  thresholdHint: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 8,
  },
  loadingHint: {
    marginTop: 20,
    fontSize: 13,
    color: palette.textSecondary,
    textAlign: "center",
  },
  missingWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: palette.background,
  },
  missingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  missingSubtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});

export default SensorDetailScreen;
