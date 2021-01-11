#!/usr/bin/env ts-node

import path from "path";
import fs from "fs";
import execa from "execa";

import { ConditionsMap, State } from "../machine";
import {
  darkTheme,
  generateMermaid,
  generateMermaidFromPathways,
  generateMermaidFromStateLinks,
  lightTheme,
} from "./generate-state-links";
import { StateLink } from "./utils";

export type Direction = "vertical" | "horizontal";

export type Theme = "dark" | "light";

export type SupportedExtension = "pdf" | "svg" | "png";

export const supportedExtensions: SupportedExtension[] = ["pdf", "svg", "png"];

type Options = {
  direction: Direction;
  width: number;
  height: number;
  theme: Theme;
  output: string;
  nodeModulesPath: string;
  extension: SupportedExtension;
};

const writeTempFile = (options: Options, contents: string) => {
  const filePath = path.join(process.cwd(), `${options.output}.mmd`);
  fs.writeFileSync(filePath, contents, "utf8");
  return filePath;
};

const writeMermaidSvg = async (options: Options, tempFilePath: string) => {
  const outputPath = path.join(
    process.cwd(),
    `${options.output}.${options.extension}`
  );

  const mermaidArgs = [
    ["-i", tempFilePath],
    ["-o", outputPath],
    ["-w", options.width.toString()],
    ["-H", options.height.toString()],
    [
      "-b",
      options.theme === "dark" ? darkTheme.background : lightTheme.background,
    ],
  ];

  const localMmdc = async () => {
    const mermaidExecutable = path.join(options.nodeModulesPath, ".bin/mmdc");
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
    try {
      return await npxMmdc();
    } catch (err) {
      throw err;
    }
  }
};

const validateOptions = (options: Partial<Options>): Options => ({
  direction: "vertical",
  width: 600,
  height: 600,
  theme: "light",
  extension: "png",
  output: path.join(process.cwd(), "chart"),
  nodeModulesPath: path.join(process.cwd(), "../node_modules"),
  ...options,
});

const writeMermaidStringAsOutputFile = async (
  options: Options,
  mermaid: string
) => {
  const tempFilePath = writeTempFile(options, mermaid);
  const outputPath = await writeMermaidSvg(options, tempFilePath);
  fs.unlinkSync(tempFilePath);
  console.log(`Chart written to ${outputPath}`);
  return outputPath;
};

export const generateChart = async <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  opts: Partial<Options>,
  states: State<Context, Conditions, AdditionalEntryData>[]
) => {
  try {
    const options = validateOptions(opts);
    const mermaid = generateMermaid(states, {
      theme: options.theme === "dark" ? darkTheme : lightTheme,
      direction: options.direction,
    });
    console.log({ mermaid });
    return writeMermaidStringAsOutputFile(options, mermaid);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const generateChartFromLinks = async <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  opts: Partial<Options>,
  states: StateLink<Context, Conditions, AdditionalEntryData>[]
) => {
  try {
    const options = validateOptions(opts);
    const mermaid = generateMermaidFromStateLinks(states, {
      theme: options.theme === "dark" ? darkTheme : lightTheme,
      direction: options.direction,
    });
    return writeMermaidStringAsOutputFile(options, mermaid);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const generateChartFromPathways = async <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  opts: Partial<Options>,
  pathways: StateLink<Context, Conditions, AdditionalEntryData>[][]
) => {
  try {
    const options = validateOptions(opts);
    const mermaid = generateMermaidFromPathways(pathways, {
      theme: options.theme === "dark" ? darkTheme : lightTheme,
      direction: options.direction,
    });
    return writeMermaidStringAsOutputFile(options, mermaid);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const flatten = <A>(arr: A[][]): A[] =>
  arr.reduce((prev, curr) => [...prev, ...curr], [] as A[]);
