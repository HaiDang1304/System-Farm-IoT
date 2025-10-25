import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { palette } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Thông tin tài khoản</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={styles.label}>Trạng thái</Text>
        <Text style={styles.value}>
          {user?.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Hướng dẫn nhanh</Text>
        <Text style={styles.tip}>
          • Đảm bảo máy chủ Node.js đang chạy để nhận dữ liệu cảm biến.
        </Text>
        <Text style={styles.tip}>
          • Nếu chạy trên thiết bị thật, hãy cập nhật địa chỉ IP trong phần cấu
          hình ứng dụng.
        </Text>
        <Text style={styles.tip}>
          • Chỉ người dùng đã xác minh email mới điều khiển được thiết bị.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutLabel}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    padding: 20,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.textSecondary,
    marginTop: 4,
  },
  value: {
    fontSize: 15,
    color: palette.textPrimary,
    marginTop: 2,
  },
  tip: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 6,
  },
  logoutButton: {
    backgroundColor: palette.danger,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  logoutLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;
