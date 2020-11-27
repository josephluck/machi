import { Text } from "react-native";
import { useOnboardingStorage } from "../machine/machine-hooks";

export const DisplayOnboardingStorage = () => {
  const { state } = useOnboardingStorage();
  return <Text>{JSON.stringify(state || {})}</Text>;
};
