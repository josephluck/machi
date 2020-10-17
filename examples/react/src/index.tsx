import React from "react";
import ReactDOM from "react-dom";
import { makeMachine } from "./lib/machine";

const machine = makeMachine(
  [
    {
      name: "Red",
      cond: (ctx) => ctx.red,
    },
    {
      name: "Amber",
      cond: (ctx) => ctx.amber,
    },
    {
      name: "Green",
      cond: (ctx) => ctx.green,
    },
  ],
  { red: false, amber: false, green: false }
);

console.log(machine);

// Render the app and use the hook:
const App = () => {
  return <div>Hello, world</div>;
};

const elm = document.createElement("div");
document.body.appendChild(elm);
ReactDOM.render(<App />, elm);
