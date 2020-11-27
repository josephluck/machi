import React from "react";
import { View, Button, Text } from "react-native";

import { useMachine } from "../machine/machine";
import { DisplayOnboardingStorage } from "../components/onboarding-storage";

export const id = "secondName";

export const screen = () => {
  const { execute, context } = useMachine();

  return (
    <View>
      <Text>What's your second name?</Text>
      <DisplayOnboardingStorage />
      <Button
        title="Next"
        onPress={() => execute({ ...context, secondName: "Luck" })}
      />
    </View>
  );
};
