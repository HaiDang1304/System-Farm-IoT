import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { palette } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { SENSOR_CONFIG } from "../services/sensorConfig";
import {
  fetchNotificationSettings,
  updateNotificationSettings,
} from "../services/api";

const DEFAULT_NOTIFICATIONS = {
  dht22: true,
  soilMoisture: true,
  light: false,
  waterLevel: true,
  rain: true,
  gas: false,
};

const createDefaultNotifications = () => ({
  ...DEFAULT_NOTIFICATIONS,
});

const ICON_PACKS = {
  Feather,
  MaterialCommunityIcons,
};

const NOTIFICATION_ITEMS = [
  { id: "dht22", sensorKey: "dht22" },
  { id: "soilMoisture", sensorKey: "soil" },
  { id: "light", sensorKey: "light" },
  { id: "waterLevel", sensorKey: "water" },
  { id: "rain", sensorKey: "rain" },
  { id: "gas", sensorKey: "gas" },
].map((item) => {
  const sensor = SENSOR_CONFIG[item.sensorKey] ?? {};
  const primaryMetric = sensor.metrics?.[0] ?? {};
  return {
    ...item,
    name: sensor.name ?? item.id,
    description: sensor.description ?? "",
    icon: sensor.icon ?? { pack: "Feather", name: "bell" },
    accent: primaryMetric.color ?? palette.primary,
  };
});

const getIconComponent = (pack) => ICON_PACKS[pack] || Feather;

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(
    createDefaultNotifications
  );
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [settingsError, setSettingsError] = useState(null);

  const enabledCount = useMemo(
    () => Object.values(notifications).filter(Boolean).length,
    [notifications]
  );
  const anyEnabled = enabledCount > 0;

  const handleLogout = useCallback(() => {
    Alert.alert("Đăng xuất", "Bạn chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert("Không thể đăng xuất", error.message);
          }
        },
      },
    ]);
  }, [logout]);

  const syncSettings = useCallback(
    async (nextState) => {
      if (!user?.uid) return;
      setSyncing(true);
      setSettingsError(null);
      try {
        await updateNotificationSettings(user.uid, nextState);
      } catch (error) {
        console.error("Không thể cài đặt cập nhật:", error);
        setSettingsError(
          error.message || "Không thể cài đặt cập nhật thông báo."
        );
      } finally {
        setSyncing(false);
      }
    },
    [user?.uid]
  );

  const handleToggleSensor = useCallback(
    (key) => {
      setNotifications((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        syncSettings(next);
        return next;
      });
    },
    [syncSettings]
  );

  const handleToggleAll = useCallback(() => {
    setNotifications((prev) => {
      const hasEnabled = Object.values(prev).some(Boolean);
      const next = Object.keys(prev).reduce((acc, key) => {
        acc[key] = !hasEnabled;
        return acc;
      }, {});
      syncSettings(next);
      return next;
    });
  }, [syncSettings]);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      if (!user?.uid) {
        setNotifications(createDefaultNotifications());
        setLoadingSettings(false);
        return;
      }

      setLoadingSettings(true);
      setSettingsError(null);
      setNotifications(createDefaultNotifications());

      try {
        const response = await fetchNotificationSettings(user.uid);
        if (!isMounted) return;

        const remoteNotifications =
          response?.notifications && typeof response.notifications === "object"
            ? response.notifications
            : null;

        if (remoteNotifications) {
          setNotifications((prev) => ({
            ...prev,
            ...remoteNotifications,
          }));
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Không thể tải cài đặt:", error);
        setSettingsError(
          error.message || "Không thể tải cài đặt thông báo."
        );
      } finally {
        if (isMounted) {
          setLoadingSettings(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Thông tin tài khoản</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || "--"}</Text>
        <Text style={styles.label}>Trạng thái</Text>
        <Text style={styles.value}>
          {user?.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
        </Text>
        {user?.uid ? (
          <>
            <Text style={styles.label}>Mã tài khoản</Text>
            <Text style={styles.valueMonospace}>{user.uid}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsHeaderText}>
            <Text style={styles.title}>Cài đặt thông báo</Text>
            <Text style={styles.subtitle}>
              Bật/Tắt thông báo cho từng nhóm cảm biến.
            </Text>
          </View>
          <Switch
            value={anyEnabled}
            onValueChange={handleToggleAll}
            thumbColor={anyEnabled ? palette.primary : "#f4f3f4"}
            trackColor={{
              false: palette.border,
              true: `${palette.primary}80`,
            }}
            ios_backgroundColor={palette.border}
          />
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>Đăng hoạt động</Text>
          </View>
          <Text style={styles.statusValue}>
            {enabledCount}/{NOTIFICATION_ITEMS.length} cảm biến
          </Text>
        </View>

        {loadingSettings ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.loadingText}>Đang tải cài đặt...</Text>
          </View>
        ) : (
          NOTIFICATION_ITEMS.map((item) => {
            const IconComponent = getIconComponent(item.icon.pack);
            const isEnabled = !!notifications[item.id];
            return (
              <View key={item.id} style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <View
                    style={[
                      styles.toggleIcon,
                      { backgroundColor: `${item.accent}20` },
                    ]}
                  >
                    <IconComponent
                      name={item.icon.name}
                      size={22}
                      color={item.accent}
                    />
                  </View>
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleTitle}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.toggleDescription}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => handleToggleSensor(item.id)}
                  thumbColor={isEnabled ? item.accent : "#f4f3f4"}
                  trackColor={{
                    false: palette.border,
                    true: `${item.accent}80`,
                  }}
                  ios_backgroundColor={palette.border}
                />
              </View>
            );
          })
        )}

        {settingsError ? (
          <Text style={styles.errorText}>{settingsError}</Text>
        ) : null}
        {syncing ? (
          <Text style={styles.syncHint}>Đang đồng bộ cài đặt...</Text>
        ) : null}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutLabel}>Đăng xuất</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.textSecondary,
    marginTop: 16,
  },
  value: {
    fontSize: 15,
    color: palette.textPrimary,
    marginTop: 4,
  },
  valueMonospace: {
    fontSize: 14,
    color: palette.textPrimary,
    marginTop: 4,
    fontFamily: "monospace",
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  settingsHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${palette.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: palette.primary,
    fontWeight: "600",
  },
  statusValue: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: palette.textSecondary,
    marginLeft: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: `${palette.border}90`,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    flex: 1,
    marginLeft: 14,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  toggleDescription: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: palette.danger,
  },
  syncHint: {
    marginTop: 8,
    fontSize: 12,
    color: palette.textSecondary,
  },
  logoutButton: {
    backgroundColor: palette.danger,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  logoutLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;
