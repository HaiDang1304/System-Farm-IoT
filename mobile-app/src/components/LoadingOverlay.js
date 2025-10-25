import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { palette } from "../theme/colors";

export const LoadingOverlay = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={palette.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    zIndex: 10,
  },
});

export default LoadingOverlay;
