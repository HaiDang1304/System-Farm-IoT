import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SensorDetailScreen from "../screens/SensorDetailScreen";
import AppTabs from "./AppTabs";
import { useAuth } from "../context/AuthContext";
import { palette } from "../theme/colors";

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={palette.primary} />
  </View>
);

const AppNavigator = () => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: palette.textPrimary,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      {user ? (
        <>
          <Stack.Screen
            name="Main"
            component={AppTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SensorDetail"
            component={SensorDetailScreen}
            options={{ title: "Chi tiết cảm biến" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: "Đăng ký" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AppNavigator;
