import React from "react";
import { View, ScrollView, StyleSheet, Text } from "react-native";
import { DisplayOnboardingStorage } from "./onboarding-storage";

export const Screen = ({
  children,
  title,
  buttons,
}: {
  children?: React.ReactNode;
  title: string;
  buttons?: React.ReactNode[];
}) => (
  <View style={styles.container}>
    <Text style={[styles.title, styles.content]}>{title}</Text>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
    <View style={styles.content}>
      <DisplayOnboardingStorage style={{ marginBottom: 20 }} />
      {buttons}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
});
