import { Condition, State } from "@josephluck/machi/src/machine";

import { makeMachineHooks } from "./machine-hooks";

import * as Welcome from "../screens/welcome";
import * as NameScreen from "../screens/name";
import * as AgeScreen from "../screens/age";
import * as SuccessScreen from "../screens/success";
import * as FailureScreen from "../screens/failure";

type Context = {
  hasSeenWelcome: boolean;
  name?: string;
  age?: number;
};

type AdditionalEntryData = {};

type Conditions = Record<string, Condition<Context>>;

export const states: State<Context, Conditions, AdditionalEntryData>[] = [
  {
    id: Welcome.id,
    isDone: [
      function hasSeenWelcome(context) {
        return context.hasSeenWelcome;
      },
    ],
  },
  {
    id: NameScreen.id,
    isDone: [
      function hasEnteredName(context) {
        return Boolean(context.name);
      },
    ],
  },
  {
    id: AgeScreen.id,
    isDone: [
      function hasEnteredAge(context) {
        return Boolean(context.age);
      },
    ],
  },
  {
    fork: "isOfDrinkingAge",
    requirements: [
      function isOfLegalDrinkingAge(context) {
        return !!context.age && context.age >= 18;
      },
    ],
    states: [{ id: SuccessScreen.id, isDone: [() => false] }],
  },
  {
    id: FailureScreen.id,
    isDone: [() => false],
  },
];

const machineHooks = makeMachineHooks<Context, AdditionalEntryData>({
  states,
  conditions: {},
  initialContext: {
    hasSeenWelcome: false,
    name: undefined,
    age: undefined,
  },
});

export const MachineProvider = machineHooks.MachineProvider;

export const useMachine = machineHooks.useMachine;
