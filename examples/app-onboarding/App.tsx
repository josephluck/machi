import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import { MachineProvider } from "./machine/machine";
import { navigationRef } from "./navigation";

// screens
import * as WelcomeScreen from "./screens/welcome";
import * as NameScreen from "./screens/name";
import * as AgeScreen from "./screens/age";
import * as SuccessScreen from "./screens/success";
import * as FailureScreen from "./screens/failure";

const Stack = createStackNavigator();

export default () => (
  <MachineProvider>
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen
          name={WelcomeScreen.id}
          component={WelcomeScreen.screen}
        />
        <Stack.Screen name={NameScreen.id} component={NameScreen.screen} />
        <Stack.Screen name={AgeScreen.id} component={AgeScreen.screen} />
        <Stack.Screen
          name={SuccessScreen.id}
          component={SuccessScreen.screen}
        />
        <Stack.Screen
          name={FailureScreen.id}
          component={FailureScreen.screen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  </MachineProvider>
);
