import React, { useState } from "react";
import { Button, TextInput } from "react-native";

import { useMachine } from "../machine/machine";
import { Screen } from "../components/screen";
import { useCallback } from "react";

export const id = "name";

export const screen = () => {
  const { execute, context } = useMachine();
  const [nameValue, setNameValue] = useState("");

  const handleNext = useCallback(
    () => execute({ ...context, name: nameValue }),
    [nameValue]
  );

  return (
    <Screen
      title="What's your name?"
      buttons={[
        <Button
          title="Next"
          key="next"
          disabled={!nameValue.length}
          onPress={handleNext}
        />,
      ]}
    >
      <TextInput
        value={nameValue}
        onChangeText={setNameValue}
        style={{ borderWidth: 1, borderColor: "#ccc" }}
      />
    </Screen>
  );
};
