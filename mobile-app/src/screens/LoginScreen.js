import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { palette } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

const LoginScreen = ({ navigation }) => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập email và mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
    } catch (error) {
      Alert.alert("Đăng nhập thất bại", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
    } catch (error) {
      Alert.alert("Đăng nhập Google thất bại", error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={styles.panel}>
        <Text style={styles.title}>Hệ thống IoT Farm</Text>
        <Text style={styles.subtitle}>Đăng nhập để quản lý trang trại</Text>

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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonLabel}>
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            style={styles.linkWrapper}
          >
            <Text style={styles.linkText}>
              Chưa có tài khoản?{" "}
              <Text style={styles.linkHighlight}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerWrapper}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>hoặc</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            googleLoading && styles.buttonDisabled,
          ]}
          onPress={handleGoogleLogin}
          disabled={googleLoading}
        >
          <Image
            source={{
              uri: "https://img.icons8.com/color/48/google-logo.png",
            }}
            style={styles.googleIcon}
          />
          <Text style={styles.googleLabel}>
            {googleLoading ? "Đang xử lý..." : "Đăng nhập với Google"}
          </Text>
        </TouchableOpacity>
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
    fontSize: 26,
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
  dividerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: palette.textSecondary,
    fontSize: 13,
  },
  googleButton: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  googleLabel: {
    fontSize: 15,
    color: palette.textPrimary,
    fontWeight: "600",
  },
});

export default LoginScreen;
