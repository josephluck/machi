#!/usr/bin/env ts-node

import path from "path";
import makeSpinner from "ora";
import yargs from "yargs/yargs";

import { State } from "../machine";
import {
  Direction,
  generateChart,
  generateChartFromPathways,
  SupportedExtension,
  supportedExtensions,
  Theme,
} from "./files";
import { getPathwaysToState } from "../pathways";

const spinner = makeSpinner();

const directionChoice: ReadonlyArray<Direction> = ["vertical", "horizontal"];

const themeChoice: ReadonlyArray<Theme> = ["dark", "light"];

const options = yargs(process.argv.slice(2)).options({
  states: {
    type: "string",
    alias: "s",
    demandOption: true,
    description:
      'Path to the file containing your states export. Note that this file MUST export your states array as the default export, or as a named export under the "states" export. The path is relative to the working directory this script is run from.',
  },
  output: {
    type: "string",
    alias: "o",
    demandOption: true,
    description: `Path to the output file the generated chart will be saved to. Please provide the extension using the --extension option. The path is relative to the working directory this script is run from.`,
  },
  extension: {
    choices: supportedExtensions,
    default: "png" as SupportedExtension,
    description: "The extension of the output file.",
  },
  direction: {
    alias: "d",
    choices: directionChoice,
    default: "vertical" as Direction,
    description: "The direction of the generated chart",
  },
  paths: {
    type: "string",
    alias: "p",
    description:
      "When provided, will generate a chart listing all the possible pathways to this state. Provide an entry id or a fork name",
  },
  theme: {
    alias: "t",
    choices: themeChoice,
    default: "light" as Theme,
    description: "The theme of the generated chart",
  },
  height: {
    alias: "H",
    type: "number",
    description:
      "The height of the generated chart. Tweak this value if your generated chart is too small. Note only applies for PNG and PDF types.",
    default: 600,
  },
  width: {
    alias: "w",
    type: "number",
    default: 800,
    description:
      "The width of the generated chart. Tweak this value if your generated chart is too small. Note only applies for PNG and PDF types.",
  },
  nodeModulesPath: {
    type: "string",
    default: path.join(__dirname, "../../node_modules"),
    description:
      "Optional path to node_modules (where you may have installed @mermaid-js/mermaid-cli). The default should work, but you may pass a specific path to your node_modules if you run in to difficulty with the default in yarn / lerna mono-repositories.",
  },
}).argv;

const readStatesFromFile = (): State<{}, {}, {}>[] => {
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

const run = async () => {
  try {
    spinner.start("Generating chart");
    const states = readStatesFromFile();
    const outputPath = options.paths
      ? await generateChartFromPathways(
          options,
          getPathwaysToState(options.paths, states)
        )
      : await generateChart(options, states);
    spinner.succeed(`Chart generated to ${outputPath}`);
  } catch (err) {
    spinner.fail(err.message);
  }
};

run();
