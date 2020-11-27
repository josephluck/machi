import React from "react";
import { View, Button, Text } from "react-native";

import { useMachine } from "../machine/machine";
import { DisplayOnboardingStorage } from "../components/onboarding-storage";

export const id = "welcome";

export const screen = () => {
  const { execute, context } = useMachine();

  return (
    <View>
      <Text>Welcome</Text>
      <DisplayOnboardingStorage />
      <Button
        title="Start"
        onPress={() => execute({ ...context, hasSeenWelcome: true })}
      />
    </View>
  );
};
