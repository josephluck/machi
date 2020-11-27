import React from "react";
import { StyleProp, Text, TouchableOpacity, ViewStyle } from "react-native";
import { useMachine } from "../machine/machine";

import { useOnboardingStorage } from "../machine/machine-hooks";

export const DisplayOnboardingStorage = ({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) => {
  const { context } = useMachine();
  const { clearContext } = useOnboardingStorage();
  return (
    <TouchableOpacity onLongPress={clearContext} style={style}>
      <Text>{JSON.stringify(context || {})}</Text>
    </TouchableOpacity>
  );
};
