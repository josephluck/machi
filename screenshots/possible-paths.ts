import { State } from "@josephluck/machi/src/machine";

type Conditions = {
  hasChosenAuthType: () => boolean;
  isExistingCustomer: () => boolean;
  isNewCustomer: () => boolean;
  hasSeenAboutUs: () => boolean;
  hasProvidedEmail: () => boolean;
  hasProvidedPassword: () => boolean;
  hasProvidedName: () => boolean;
  hasNotProvidedName: () => boolean;
};

const states: State<{}, Conditions, {}>[] = [
  {
    id: "Splash screen",
    isDone: ["hasChosenAuthType"],
  },
  {
    fork: "Is existing customer?",
    requirements: ["isExistingCustomer"],
    states: [
      {
        id: "What's your email address?",
        isDone: ["hasProvidedEmail"],
      },
      {
        id: "What's your password?",
        isDone: ["hasProvidedPassword"],
      },
    ],
  },
  {
    fork: "Is existing customer?",
    requirements: ["isNewCustomer"],
    states: [
      {
        id: "About us",
        isDone: ["hasSeenAboutUs"],
      },
      {
        id: "Please enter your email address",
        isDone: ["hasProvidedEmail"],
      },
      {
        id: "Please choose a password",
        isDone: ["hasProvidedPassword"],
      },
    ],
  },
  {
    id: "What's your name?",
    isDone: ["hasProvidedName"],
  },
];

export default states;
