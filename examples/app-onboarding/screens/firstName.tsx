import React from "react";
import { View, Button, Text } from "react-native";

import { useMachine } from "../machine/machine";
import { DisplayOnboardingStorage } from "../components/onboarding-storage";

export const id = "firstName";

export const screen = () => {
  const { execute, context } = useMachine();

  return (
    <View>
      <Text>What's your first name?</Text>
      <DisplayOnboardingStorage />
      <Button
        title="Next"
        onPress={() => execute({ ...context, firstName: "Joe" })}
      />
    </View>
  );
};
