import React from "react";
import ReactDOM from "react-dom";
import { State, Condition } from "./lib/machine";
import Mermaid from "react-mermaid2";
// import { process } from "./utils";
import { process } from "./utils2";

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
            isDone: ["no"],
          },
        ],
      },
      { name: "Free beer", isDone: ["no"] },
    ],
  },
  {
    fork: "Old enough?",
    requirements: ["isTooYoung"],
    states: [{ name: "Too young", isDone: ["no"] }],
  },
];

const beerConditions: Record<string, Condition<any>> = {
  no: () => false,
  hasEnteredAge: (ctx) => !!ctx.age,
  hasEnteredName: (ctx) => !!ctx.name && ctx.name.length > 0,
  hasEnteredAddress: (ctx) => !!ctx.address,
  hasEnteredJobTitle: (ctx) => !!ctx.jobTitle,
  hasEnteredSalary: (ctx) => !!ctx.salary,
  isOfLegalDrinkingAge: (ctx) => !!ctx.age && ctx.age >= 18,
  isTooYoung: (ctx) => !!ctx.age && ctx.age < 18,
  isRich: (ctx) => !!ctx.salary && ctx.salary > 100000,
  isEligible: (ctx) => !!ctx.salary && ctx.salary > 100000,
  enteringAddressManually: (ctx) => ctx.bypassPostcodeLookup,
};

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
  // { name: "curveball", isDone: [] },
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
    isDone: [],
  },
];

const simpleConditions: Record<string, Condition<any>> = {
  first: () => true,
  second: () => true,
  third: () => true,
  left: () => true,
  right: () => true,
  middle: () => true,
  red: () => true,
  green: () => true,
  blue: () => true,
  yes: () => true,
  no: () => true,
  up: () => true,
  down: () => true,
  high: () => true,
  highred: () => true,
};

const rendered = process(beerStates, beerConditions);
// const rendered = process(simpleStates, simpleConditions);

const App = () => {
  console.log(rendered.split("\n"));
  return <Mermaid chart={rendered} />;
};

const elm = document.createElement("div");
document.body.appendChild(elm);
ReactDOM.render(<App />, elm);
