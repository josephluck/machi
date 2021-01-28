import React from "react";
import ReactDOM from "react-dom";
import Mermaid from "react-mermaid2";

import { generateMermaid } from "@josephluck/machi/src/graph/generate-mermaid-string";

import { states } from "./states";

const rendered = generateMermaid(states);

const App = () => {
  console.log(rendered.split("\n"));
  return (
    <>
      <Mermaid chart={rendered} />
      <style>
        {`html, body {background: #ffffff;}
        svg {
        height: auto !important;
      }`}
      </style>
    </>
  );
};

const elm = document.createElement("div");
document.body.appendChild(elm);
ReactDOM.render(<App />, elm);
