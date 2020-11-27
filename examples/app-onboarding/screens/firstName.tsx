import React from "react";
import { Button } from "react-native";

import { useMachine } from "../machine/machine";
import { Screen } from "../components/screen";

export const id = "firstName";

export const screen = () => {
  const { execute, context } = useMachine();

  return (
    <Screen
      title="What's your first name?"
      buttons={[
        <Button
          title="Next"
          onPress={() => execute({ ...context, firstName: "Joe" })}
        />,
      ]}
    />
  );
};
