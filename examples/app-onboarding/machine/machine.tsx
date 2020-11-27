import { makeMachineHooks } from "./machine-hooks";

import * as Welcome from "../screens/welcome";
import * as FirstName from "../screens/firstName";
import * as SecondName from "../screens/secondName";

type Context = {
  hasSeenWelcome: boolean;
  firstName?: string;
  secondName?: string;
};

type AdditionalEntryData = {};

const machineHooks = makeMachineHooks<Context, AdditionalEntryData>({
  states: [
    {
      id: Welcome.id,
      isDone: [
        function hasSeenWelcome(context) {
          return context.hasSeenWelcome;
        },
      ],
    },
    {
      id: FirstName.id,
      isDone: [
        function hasEnteredFirstName(context) {
          return Boolean(context.firstName);
        },
      ],
    },
    {
      id: SecondName.id,
      isDone: [
        function hasEnteredSecondName(context) {
          return Boolean(context.secondName);
        },
      ],
    },
  ],
  conditions: {},
  initialContext: {
    hasSeenWelcome: false,
    firstName: undefined,
    secondName: undefined,
  },
});

export const MachineProvider = machineHooks.MachineProvider;

export const useMachine = machineHooks.useMachine;
