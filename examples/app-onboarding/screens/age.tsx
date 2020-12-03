import React, { useCallback, useState } from "react";
import { Button, TextInput } from "react-native";

import { useMachine } from "../machine/machine";
import { Screen } from "../components/screen";

export const id = "age";

export const screen = () => {
  const { execute, context } = useMachine();
  const [ageValue, setAgeValue] = useState<number | undefined>(undefined);

  const handleNext = useCallback(() => execute({ ...context, age: ageValue }), [
    ageValue,
  ]);

  const handleChangeValue = useCallback(
    (val: string) => {
      const num = val && val.length ? Number(val.trim()) : undefined;
      setAgeValue(Number.isNaN(num) ? undefined : num);
    },
    [setAgeValue]
  );

  return (
    <Screen
      title="What's your age?"
      buttons={[<Button title="Next" key="next" onPress={handleNext} />]}
    >
      <TextInput
        value={ageValue ? ageValue.toString() : undefined}
        keyboardType="phone-pad"
        onChangeText={handleChangeValue}
        style={{ borderWidth: 1, borderColor: "#ccc" }}
      />
    </Screen>
  );
};
