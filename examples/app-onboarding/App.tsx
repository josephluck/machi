import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import { MachineProvider } from "./machine/machine";

// screens
import * as Welcome from "./screens/welcome";
import * as FirstName from "./screens/firstName";
import * as SecondName from "./screens/secondName";

const Stack = createStackNavigator();

export default () => (
  <NavigationContainer>
    <MachineProvider>
      <Stack.Navigator>
        <Stack.Screen name={Welcome.id} component={Welcome.screen} />
        <Stack.Screen name={FirstName.id} component={FirstName.screen} />
        <Stack.Screen name={SecondName.id} component={SecondName.screen} />
      </Stack.Navigator>
    </MachineProvider>
  </NavigationContainer>
);
