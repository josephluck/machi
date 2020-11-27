import React from "react";
import { Button, Text, View } from "react-native";

import { useOnboardingStorage } from "../machine/machine-hooks";

export const DisplayOnboardingStorage = () => {
  const { state, clearContext } = useOnboardingStorage();
  return (
    <View>
      <Text>{JSON.stringify(state || {})}</Text>
      <Button title="Clear" onPress={clearContext} />
    </View>
  );
};
