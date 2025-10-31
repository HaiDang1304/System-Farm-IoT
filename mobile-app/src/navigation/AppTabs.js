import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import SensorsScreen from "../screens/SensorsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { palette } from "../theme/colors";

const Tab = createBottomTabNavigator();

const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: palette.border,
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = "activity";
          if (route.name === "Dashboard") iconName = "home";
          if (route.name === "Sensors") iconName = "cpu";
          if (route.name === "Profile") iconName = "user";
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: "Tổng quan" }}
      />
      <Tab.Screen
        name="Sensors"
        component={SensorsScreen}
        options={{ tabBarLabel: "Thống kê" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Cài đặt" }}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;
