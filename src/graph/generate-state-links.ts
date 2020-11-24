import { isEntry, isFork, State } from "../machine";
import {
  deduplicateLinks,
  Link,
  REASONS,
  linksToMermaid,
  filterInvalidLinks,
  toName,
  makeId,
  toId,
  getExistingSkippedForkLink,
  sortLinks,
  isGroup,
} from "./utils";

/**
 * Takes a list of nested states and generates an array of links between states
 * in logical flow order. Takes that result and generates a mermaid-compatible
 * graph from them.
 */
export const generateStateLinks = (states: State<any, any, {}>[]) => {
  const result: Link[] = [];

  const run = (
    _states: State<any, any, {}>[],
    /**
     * Keeps track of the parent's next state when a fork is entered, so all of
     * the final entries in the fork (and the nested forks) will successfully
     * link to the next logical state back up the tree.
     */
    nextStateInParentLevel?: State<any, any, {}>
  ) => {
    _states.forEach((state, i) => {
      const nextState = _states.find(
        /**
         * This ensures that the next state link does not belong to the same
         * fork as the current fork (even though the machine will re-evaluate
         * sibling forks of the same id, their requirements should always be
         * mutually exclusive)
         */
        (s, ix) => ix > i && makeId(s) !== makeId(state)
      );
      if (isFork(state)) {
        result.push({
          type: "link",
          from: state,
          to: state.states[0],
          reason: REASONS.FORK_ENTERED,
        });
        if (state.chartGroup) {
          result.push({
            type: "group",
            id: state.chartGroup,
            end: false,
          });
        }
        run(state.states, nextState || nextStateInParentLevel);

        // TODO: atm this group end is placed after link that the fork's
        // terminal states link to. It should really be before that link..
        if (state.chartGroup) {
          result.push({
            type: "group",
            id: state.chartGroup,
            end: true,
          });
        }
        if (nextState || nextStateInParentLevel) {
          const toState = nextState || nextStateInParentLevel;
          const existingSkippedFork = getExistingSkippedForkLink(
            result,
            state,
            toState
          );

          if (existingSkippedFork) {
            // There's already a skipped link for this fork, so we need to prevent
            // duplicating the link, but retain all the necessary requirements
            // for skipping the fork (these become "and false" conditions for
            // skipping as the combination of all the falsy entry conditions are
            // the skip condition for the fork.
            result.forEach((link) => {
              if (
                !isGroup(link) &&
                makeId(link.from) === makeId(state) &&
                makeId(link.to) === makeId(toState) &&
                link.reason === REASONS.FORK_SKIPPED
              ) {
                // Make a deep(ish) copy of the state so we don't inadvertently
                // change the fork's entry links requirements
                link.from = {
                  ...link.from,
                  requirements: [
                    ...link.from.requirements,
                    ...state.requirements,
                  ],
                };
              }
            });
          } else {
            result.push({
              type: "link",
              from: state,
              to: toState,
              reason: REASONS.FORK_SKIPPED,
            });
          }
        }
      }
      if (isEntry(state) && state.isDone.length > 0) {
        if (nextState || nextStateInParentLevel) {
          result.push({
            type: "link",
            from: state,
            to: nextState || nextStateInParentLevel,
            reason: REASONS.ENTRY_DONE,
          });
        }
      }
    });
  };

  run(states);

  const deduplicatedResult = deduplicateLinks(result);
  const filteredLinks = filterInvalidLinks(states, deduplicatedResult);
  const sortedLinks = sortLinks(filteredLinks);

  // console.log(
  //   sortedLinks.map((link) => ({
  //     from: toName(link.from),
  //     to: toName(link.to),
  //     reason: link.reason,
  //   }))
  // );

  return sortedLinks;
};

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

export const generateMermaid = (
  states: State<any, any, {}>[],
  { theme = darkTheme, direction = "vertical" }: Options = {}
) => {
  const links = generateStateLinks(states);
  const mermaidLines = linksToMermaid(links);
  const themeLine = `%%{init: ${JSON.stringify({
    theme: "base",
    themeVariables: theme,
  })}}%%`;

  const directionMermaid = direction === "horizontal" ? "LR" : "TD";

  return `${themeLine}\ngraph ${directionMermaid}\n${mermaidLines.join("\n")}`;
};
