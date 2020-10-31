import React from "react";
import ReactDOM from "react-dom";
import Mermaid from "react-mermaid2";

import { State } from "./lib/machine";
import { generateMermaid } from "./generate-state-links";

const beerStates: State<any, any>[] = [
  {
    name: "Age?",
    isDone: ["hasEnteredAge"],
  },
  {
    fork: "Old enough?",
    requirements: ["isOfLegalDrinkingAge"],
    states: [
      { name: "Name?", isDone: ["hasEnteredName"] },
      { name: "Postcode?", isDone: ["hasEnteredAddress"] },
      {
        fork: "Manual address",
        requirements: ["enteringAddressManually"],
        states: [
          {
            name: "Address?",
            isDone: ["hasEnteredAddress"],
          },
        ],
      },
      { name: "Job title?", isDone: ["hasEnteredJobTitle"] },
      { name: "Salary?", isDone: ["hasEnteredSalary"] },
      {
        fork: "Too rich?",
        requirements: ["isRich"],
        states: [
          {
            name: "Too rich",
            isDone: [],
          },
        ],
      },
      { name: "Free beer", isDone: [] },
    ],
  },
  {
    fork: "Old enough?",
    requirements: ["isTooYoung"],
    states: [{ name: "Too young", isDone: [] }],
  },
];

const simpleStates: State<any, any>[] = [
  { name: "first", isDone: ["first"] },
  { name: "second", isDone: ["first", "second"] },
  { name: "third", isDone: ["third"] },
  {
    fork: "is more than 10",
    requirements: ["moreThan10"],
    states: [
      { name: "fourth", isDone: ["fourth"] },
      { name: "fifth", isDone: ["fifth"] },
      { name: "sixth", isDone: ["sixth"] },
    ],
  },
  {
    fork: "is less than 10",
    requirements: ["lessThan10"],
    states: [
      { name: "seventh", isDone: ["seventh"] },
      { name: "eighth", isDone: ["eighth"] },
      { name: "ninth", isDone: ["ninth"] },
    ],
  },
  {
    fork: "is exactly ten",
    requirements: ["isExactly10"],
    states: [
      {
        fork: "is decimal",
        requirements: ["isDecimal"],
        states: [
          { name: "tenth", isDone: ["tenth"] },
          {
            fork: "is one decimal point",
            requirements: ["isOneDecimalPoint"],
            states: [{ name: "eleventh", isDone: ["eleventh"] }],
          },
        ],
      },
      { name: "twelfth", isDone: ["twelfth"] },
      { name: "thirteenth", isDone: ["thirteenth"] },
      { name: "fourteenth", isDone: ["fourteenth"] },
    ],
  },
  {
    name: "done",
    isDone: ["no"],
  },
];

const rendered = generateMermaid(beerStates);
// const rendered = process(simpleStates);

const App = () => {
  console.log(rendered.split("\n"));
  return <Mermaid chart={rendered} />;
};

const elm = document.createElement("div");
document.body.appendChild(elm);
ReactDOM.render(<App />, elm);
