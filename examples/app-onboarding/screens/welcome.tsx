import React from "react";
import { Button } from "react-native";

import { useMachine } from "../machine/machine";
import { Screen } from "../components/screen";

export const id = "welcome";

export const screen = () => {
  const { execute, context } = useMachine();

  return (
    <Screen
      title="Welcome"
      buttons={[
        <Button
          title="Start"
          onPress={() => execute({ ...context, hasSeenWelcome: true })}
        />,
      ]}
    />
  );
};
