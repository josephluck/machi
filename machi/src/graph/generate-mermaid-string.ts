import {
  ConditionsMap,
  isEntryInternal,
  isForkInternal,
  State,
} from "../machine";
import {
  generateStateLinks,
  Link,
  REASONS,
  StateLink,
} from "./generate-state-links";
import { condNames, isGroup, stringifyToId, toName } from "./utils";

type Theme = {
  darkMode: boolean;
  background: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  noteBkgColor: string;
  mainBkg: string;
  lineColor: string;
  edgeLabelBackground: string;
};

export const darkTheme: Theme = {
  darkMode: true,
  background: "#000000",
  primaryColor: "#444444",
  secondaryColor: "#888888",
  tertiaryColor: "#111111",
  noteBkgColor: "transparent",
  mainBkg: "#222222",
  lineColor: "#666666",
  edgeLabelBackground: "transparent",
};

export const lightTheme: Theme = {
  darkMode: false,
  background: "#ffffff",
  primaryColor: "#aaaaaa",
  secondaryColor: "#999999",
  tertiaryColor: "#f8f8f8",
  noteBkgColor: "transparent",
  mainBkg: "#eeeeee",
  lineColor: "#555555",
  edgeLabelBackground: "transparent",
};

type Direction = "horizontal" | "vertical";

type Options = {
  theme?: Theme;
  direction?: Direction;
};

export const generateMermaid = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  states: State<Context, Conditions, AdditionalEntryData>[],
  options: Options = {}
) =>
  generateMermaidFromStateLinks(
    generateStateLinks(states) as StateLink<
      Context,
      Conditions,
      AdditionalEntryData
    >[],
    options
  );

export const generateMermaidFromStateLinks = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  links: StateLink<Context, Conditions, AdditionalEntryData>[],
  { theme = darkTheme, direction = "vertical" }: Options = {}
) => {
  const mermaidLines = linksToMermaid(links);
  const themeLine = `%%{init: ${JSON.stringify({
    theme: "base",
    themeVariables: theme,
  })}}%%`;

  const directionMermaid = direction === "horizontal" ? "LR" : "TD";

  return `${themeLine}\ngraph ${directionMermaid}\n${mermaidLines.join("\n")}`;
};

export const generateMermaidFromPathways = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  pathways: StateLink<Context, Conditions, AdditionalEntryData>[][],
  { theme = darkTheme, direction = "vertical" }: Options = {}
) => {
  const mermaidLines = pathways.reduce<string[]>(
    (prev, links, i) => [
      ...prev,
      ...linksToMermaid(
        links.map((l) => ({
          ...l,
          from: {
            ...l.from,
            _internalStateId: `${l.from._internalStateId}-${i}`,
          },
          to: { ...l.to, _internalStateId: `${l.to._internalStateId}-${i}` },
        }))
      ),
    ],
    []
  );
  const themeLine = `%%{init: ${JSON.stringify({
    theme: "base",
    themeVariables: theme,
  })}}%%`;

  const directionMermaid = direction === "horizontal" ? "LR" : "TD";

  return `${themeLine}\ngraph ${directionMermaid}\n${mermaidLines.join("\n")}`;
};

export const linksToMermaid = <
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
>(
  result: Link<Context, Conditions, AdditionalEntryData>[]
) =>
  result.reduce<string[]>((prev, link) => {
    if (isGroup(link)) {
      const line = link.end
        ? "end"
        : `subgraph ${stringifyToId(link.id)} [${link.id}]`;
      return [...prev, line];
    }

    if (isForkInternal(link.from)) {
      const fromId = link.from._internalStateId;
      const toId = link.to._internalStateId;
      const isAre = link.from.requirements.length > 1 ? "are" : "is";
      const truthy =
        link.reason === REASONS.FORK_ENTERED
          ? "true"
          : link.reason === REASONS.FORK_SKIPPED
          ? "false"
          : "unknown";
      const arrow = link.reason === REASONS.FORK_SKIPPED ? "-.->" : "-->";
      const reqs = `|${condNames(link.from.requirements as string[]).join(
        " and "
      )} ${isAre} ${truthy}|`;

      if (isEntryInternal(link.to)) {
        const line = `${fromId}{${toName(
          link.from
        )}} ${arrow} ${reqs} ${toId}[${link.to.id}]`;
        return [...prev, line];
      }
      if (isForkInternal(link.to)) {
        const line = `${fromId}{${toName(
          link.from
        )}} ${arrow} ${reqs} ${toId}{${link.to!.fork}}`;
        return [...prev, line];
      }
      return prev;
    }

    const fromId = link.from._internalStateId;
    const toId = link.to._internalStateId;
    const isAre = link.from.isDone.length > 1 ? "are" : "is";
    if (isEntryInternal(link.to)) {
      const reqs = `|${condNames(link.from.isDone as string[]).join(
        " and "
      )} ${isAre} true|`;
      const line = `${fromId}[${link.from.id}] --> ${reqs} ${toId}[${link.to.id}]`;
      return [...prev, line];
    }
    if (isForkInternal(link.to)) {
      const reqs = `|${condNames(link.from.isDone as string[]).join(
        " and "
      )} ${isAre} true|`;
      const line = `${fromId}[${link.from.id}] --> ${reqs} ${toId}{${
        link.to!.fork
      }}`;
      return [...prev, line];
    }
    return prev;
  }, []);
