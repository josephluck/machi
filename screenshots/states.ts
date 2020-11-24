const states = [
  {
    id: "What's your name",
    isDone: ["hasProvidedName"],
  },
  {
    id: "And your age?",
    isDone: ["hasProvidedAge"],
  },
  {
    fork: "Old enough to drink?",
    requirements: ["isOfLegalDrinkingAge"],
    states: [
      {
        id: "Great, you can have free beer!",
        isDone: [],
      },
    ],
  },
  {
    id: "Sorry, you're too young for free beer",
    isDone: [],
  },
];

export default states;
