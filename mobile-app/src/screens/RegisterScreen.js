import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { palette } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập email và mật khẩu.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mật khẩu không khớp", "Vui lòng kiểm tra lại.");
      return;
    }

    try {
      setLoading(true);
      await register(email, password);
      Alert.alert(
        "Đăng ký thành công",
        "Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập.",
        [{ text: "Quay lại đăng nhập", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert("Đăng ký thất bại", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={styles.panel}>
        <Text style={styles.title}>Tạo tài khoản mới</Text>
        <Text style={styles.subtitle}>
          Dùng email đang quản lý để nhận thông báo.
        </Text>

        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholderTextColor={palette.textSecondary}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            secureTextEntry
            style={styles.input}
            placeholderTextColor={palette.textSecondary}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Nhập lại mật khẩu"
            secureTextEntry
            style={styles.input}
            placeholderTextColor={palette.textSecondary}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonLabel}>
              {loading ? "Đang xử lý..." : "Đăng ký"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.linkWrapper}
          >
            <Text style={styles.linkText}>
              Đã có tài khoản?{" "}
              <Text style={styles.linkHighlight}>Đăng nhập ngay</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  panel: {
    backgroundColor: palette.card,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  form: {
    marginTop: 28,
  },
  input: {
    backgroundColor: palette.background,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.textPrimary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkWrapper: {
    marginTop: 18,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  linkHighlight: {
    color: palette.primary,
    fontWeight: "600",
  },
});

export default RegisterScreen;
