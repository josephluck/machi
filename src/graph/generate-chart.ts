#!/usr/bin/env ts-node

import path from "path";
import fs from "fs";
import makeSpinner from "ora";
import execa from "execa";
import yargs from "yargs/yargs";

import { State } from "../machine";
import { darkTheme, generateMermaid, lightTheme } from "./generate-state-links";

const spinner = makeSpinner();

type Direction = "vertical" | "horizontal";
const directionChoice: ReadonlyArray<Direction> = ["vertical", "horizontal"];

type Theme = "dark" | "light";
const themeChoice: ReadonlyArray<Theme> = ["dark", "light"];

const supportedExtensions = ["pdf", "svg", "png"];

const options = yargs(process.argv.slice(2)).options({
  states: {
    type: "string",
    demandOption: true,
    description:
      'Path to the file containing your states export. Note that this file MUST export your states array as the default export, or as a named export under the "states" export. The path is relative to the working directory this script is run from.',
  },
  output: {
    type: "string",
    demandOption: true,
    description: `Path to the output file the generated chart will be saved to including the extension. ${supportedExtensions.join(
      ", "
    )} extensions are supported. The path is relative to the working directory this script is run from.`,
  },
  direction: {
    choices: directionChoice,
    default: "vertical" as Direction,
    description: "The direction of the generated chart",
  },
  theme: {
    choices: themeChoice,
    default: "light" as Theme,
    description: "The theme of the generated chart",
  },
  nodeModulesPath: {
    type: "string",
    default: "../../node_modules",
    description:
      "Optional path to node_modules (where you may have installed @mermaid-js/mermaid-cli). The default should work, but you may pass a specific path to your node_modules if you run in to difficulty with the default in yarn / lerna mono-repositories.",
  },
}).argv;

const readStatesFromFile = (): State<any, any, {}>[] => {
  const filePath = path.join(process.cwd(), options.states);
  const baseErrMessage = `Could not import states from ${filePath}`;
  const file = require(filePath);
  if (!file) {
    throw new Error(`${baseErrMessage} - not found`);
  }
  if (!file.default && !file.states) {
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
    [
      "-b",
      options.theme === "dark" ? darkTheme.background : lightTheme.background,
    ],
  ];

  const localMmdc = async () => {
    const mermaidExecutable = path.join(
      __dirname,
      options.nodeModulesPath,
      ".bin/mmdc"
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
    const mermaid = generateMermaid(states, {
      theme: options.theme === "dark" ? darkTheme : lightTheme,
      direction: options.direction,
    });
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
