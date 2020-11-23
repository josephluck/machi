#!/usr/bin/env ts-node

import path from "path";
import fs from "fs";
import makeSpinner from "ora";
import execa from "execa";
import yargs from "yargs/yargs";

import { State } from "../machine";
import { generateMermaid } from "./generate-state-links";

const spinner = makeSpinner();

type Direction = "vertical" | "horizontal";
const directionChoice: ReadonlyArray<Direction> = ["vertical", "horizontal"];

type Theme = "dark" | "light";
const themeChoice: ReadonlyArray<Theme> = ["dark", "light"];

const options = yargs(process.argv.slice(2)).options({
  states: { type: "string", demandOption: true },
  output: { type: "string", demandOption: true },
  direction: { choices: directionChoice, default: "vertical" },
  theme: { choices: themeChoice, default: "dark" },
}).argv;

const readStatesFromFile = (): State<any, any, {}>[] => {
  const filePath = path.join(process.cwd(), options.states);
  const baseErrMessage = `Could not import states from ${filePath}`;
  const file = require(filePath);
  if (!file) {
    throw new Error(`${baseErrMessage} - not found`);
  }
  if (!file.default || !file.states) {
    throw new Error(
      `${baseErrMessage} - no "states" or "default" export found`
    );
  }
  const states = file.states || file.default;
  if (!states || !Array.isArray(states)) {
    throw new Error(`${baseErrMessage} - imported states must be an array`);
  }
  return states;
};

const writeTempFile = (contents: string) => {
  const filePath = path.join(process.cwd(), "mermaid-temp.mmd");
  fs.writeFileSync(filePath, contents, "utf8");
  return filePath;
};

const writeMermaidSvg = async (tempFilePath: string) => {
  const outputPath = path.join(process.cwd(), options.output);

  const mermaidArgs = [
    ["-i", tempFilePath],
    ["-o", outputPath],
  ];

  const localMmdc = async () => {
    const mermaidExecutable = path.join(
      __dirname,
      "../../node_modules/.bin/mmdc"
    );
    await execa(mermaidExecutable, flatten(mermaidArgs));
    return outputPath;
  };

  const npxMmdc = async () => {
    await execa("npx", [
      "-p",
      "@mermaid-js/mermaid-cli",
      "mmdc",
      ...flatten(mermaidArgs),
    ]);
    return outputPath;
  };

  try {
    return await localMmdc();
  } catch (err) {
    console.warn(err);
    spinner.text =
      'Could not find local mmdc. Falling back to npx. For faster generation, you can install mmdc locally via "npm i @mermaid-js/mermaid-cli --save-dev" or "yarn add @mermaid-js/mermaid-cli --dev"';
    try {
      return await npxMmdc();
    } catch (err) {
      throw err;
    }
  }
};

const validateOutputExtension = () => {
  const parts = options.output.split(".");
  const extension = parts[parts.length - 1];
  const supportedExtensions = ["pdf", "svg", "png"];

  if (!supportedExtensions.includes(extension)) {
    throw new Error(
      `${extension} output is not currently supported. Chart generation supports ${supportedExtensions.join(
        ", "
      )} files.`
    );
  }
};

const run = async () => {
  try {
    spinner.start("Generating chart");
    validateOutputExtension();
    const states = readStatesFromFile();
    const mermaid = generateMermaid(states);
    const tempFilePath = writeTempFile(mermaid);
    const outputPath = await writeMermaidSvg(tempFilePath);
    fs.unlinkSync(tempFilePath);
    spinner.succeed(`Chart generated to ${outputPath}`);
  } catch (err) {
    spinner.fail(err.message);
  }
};

const flatten = <A>(arr: A[][]): A[] =>
  arr.reduce((prev, curr) => [...prev, ...curr], [] as A[]);

run();
