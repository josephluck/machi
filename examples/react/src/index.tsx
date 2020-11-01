import React from "react";
import ReactDOM from "react-dom";
import Mermaid from "react-mermaid2";

import { State } from "./lib/machine";
import { generateMermaid } from "./lib/graph/generate-state-links";

const beerStates: State<any, any, {}>[] = [
  {
    name: "What's your age?",
    isDone: ["hasEnteredAge"],
  },
  {
    fork: "Old enough to drink?",
    requirements: ["isOfLegalDrinkingAge"],
    states: [
      { name: "Great! What's your name?", isDone: ["hasEnteredName"] },
      { name: "And your postcode?", isDone: ["hasEnteredAddress"] },
      {
        fork: "Bypassed postcode lookup",
        requirements: ["enteringAddressManually"],
        states: [
          {
            name: "Cool. What's your address?",
            isDone: ["hasEnteredAddress"],
          },
        ],
      },
      { name: "How much money do you earn?", isDone: ["hasEnteredSalary"] },
      {
        fork: "Are you too rich for free beer?",
        requirements: ["isRich"],
        states: [
          {
            name: "You're too rich for free beer! Go buy your own!",
            isDone: [],
          },
        ],
      },
      { name: "Awesome. We'll send you some free beer!", isDone: [] },
    ],
  },
  {
    fork: "Old enough to drink?",
    requirements: ["isTooYoung"],
    states: [{ name: "Sorry, you're not old enough to drink!", isDone: [] }],
  },
];

// const simpleStates: State<any, any, {}>[] = [
//   { name: "first", isDone: ["first"] },
//   { name: "second", isDone: ["first", "second"] },
//   { name: "third", isDone: ["third"] },
//   {
//     fork: "is more than 10",
//     requirements: ["moreThan10"],
//     states: [
//       { name: "fourth", isDone: ["fourth"] },
//       { name: "fifth", isDone: ["fifth"] },
//       { name: "sixth", isDone: ["sixth"] },
//     ],
//   },
//   {
//     fork: "is less than 10",
//     requirements: ["lessThan10"],
//     states: [
//       { name: "seventh", isDone: ["seventh"] },
//       { name: "eighth", isDone: ["eighth"] },
//       { name: "ninth", isDone: ["ninth"] },
//     ],
//   },
//   {
//     fork: "is exactly ten",
//     requirements: ["isExactly10"],
//     states: [
//       {
//         fork: "is decimal",
//         requirements: ["isDecimal"],
//         states: [
//           { name: "tenth", isDone: ["tenth"] },
//           {
//             fork: "is one decimal point",
//             requirements: ["isOneDecimalPoint"],
//             states: [{ name: "eleventh", isDone: ["eleventh"] }],
//           },
//         ],
//       },
//       { name: "twelfth", isDone: ["twelfth"] },
//       { name: "thirteenth", isDone: ["thirteenth"] },
//       { name: "fourteenth", isDone: ["fourteenth"] },
//     ],
//   },
//   {
//     name: "done",
//     isDone: ["no"],
//   },
// ];

const simpleBeerStates = [
  {
    name: "What's your name",
    isDone: ["hasProvidedName"],
  },
  {
    name: "And your age?",
    isDone: ["hasProvidedAge"],
  },
  {
    fork: "Old enough to drink?",
    requirements: ["isOfLegalDrinkingAge"],
    states: [
      {
        name: "Great, you can have free beer!",
        isDone: [],
      },
    ],
  },
  {
    fork: "Old enough to drink?",
    requirements: ["isTooYoung"],
    states: [
      {
        name: "Sorry, you're too young for free beer",
        isDone: [],
      },
    ],
  },
];

const rendered = generateMermaid(simpleBeerStates);
// const rendered = process(simpleStates);

const App = () => {
  console.log(rendered.split("\n"));
  return <Mermaid chart={rendered} />;
};

const elm = document.createElement("div");
document.body.appendChild(elm);
ReactDOM.render(<App />, elm);
