import React from "react";
import { Button } from "react-native";

import { useMachine } from "../machine/machine";
import { Screen } from "../components/screen";

export const id = "secondName";

export const screen = () => {
  const { execute, context } = useMachine();

  return (
    <Screen
      title="What's your second name?"
      buttons={[
        <Button
          title="Next"
          onPress={() => execute({ ...context, secondName: "Luck" })}
        />,
      ]}
    />
  );
};
