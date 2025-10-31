import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { palette } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { useSensorData } from "../hooks/useSensorData";
import { SensorCard } from "../components/SensorCard";
import { SENSOR_LIST } from "../services/sensorConfig";

const formatValue = (value) => {
  if (value === null || value === undefined) return "--";
  if (typeof value === "number") {
    if (Math.abs(value) >= 100) {
      return value.toFixed(0);
    }
    return value.toFixed(1);
  }
  return value;
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { latest, loading, error, refresh } = useSensorData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 11) return "Chào buổi sáng";
    if (hours < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {greeting}, {user?.email?.split("@")[0] || "nha nong thong minh"}!
        </Text>
        <Text style={styles.subtitle}>
          Theo dõi và quản lý hệ thống nông nghiệp IoT của bạn
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
        </View>
      ) : null}

      <View style={styles.cardsWrapper}>
        {SENSOR_LIST.map((sensor) => {
          const metric = sensor.metrics[0];
          const value = latest ? formatValue(latest[metric.key]) : "--";
          return (
            <SensorCard
              key={sensor.key}
              title={sensor.name}
              subtitle={sensor.description}
              value={value}
              unit={metric.unit}
              icon={sensor.icon}
              color={metric.color}
              onPress={() =>
                navigation.navigate("SensorDetail", {
                  sensorKey: sensor.key,
                })
              }
            />
          );
        })}
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: 6,
  },
  cardsWrapper: {
    marginBottom: 16,
  },
  loadingHint: {
    marginTop: 18,
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: "center",
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
});

export default DashboardScreen;
