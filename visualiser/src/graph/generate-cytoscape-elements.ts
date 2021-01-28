import {
  generateStateLinks,
  REASONS,
  StateLink,
} from "@josephluck/machi/src/graph/generate-state-links";
import { condNames } from "@josephluck/machi/src/graph/utils";
import {
  isForkInternal,
  State,
  StateInternal,
} from "@josephluck/machi/src/machine";

export const generateCytoscapeElements = (
  states: State<any, any, {}>[]
): cytoscape.ElementDefinition[] => {
  const links = generateStateLinks(states).filter(
    (link) => link.type === "link"
  ) as StateLink<any, any, {}>[];

  const stateToElementDefinition = (
    state: StateInternal<any, any, {}>
  ): cytoscape.ElementDefinition => ({
    data: {
      id: state._internalStateId,
      label: isForkInternal(state) ? state.fork : state.id,
    },
    grabbable: false,
  });

  const fromNodes = links.map((link) => stateToElementDefinition(link.from));

  const toNodes = links.map((link) => stateToElementDefinition(link.to));

  const edges = links.map((link) => {
    const requirements = isForkInternal(link.from)
      ? link.from.requirements
      : link.from.isDone;
    const isAre = requirements.length > 1 ? "are" : "is";
    const truthy =
      link.reason === REASONS.FORK_ENTERED
        ? "true"
        : link.reason === REASONS.FORK_SKIPPED
        ? "false"
        : link.reason === REASONS.ENTRY_DONE
        ? "true"
        : "unknown";
    const conditions = condNames(requirements as string[]);
    return {
      data: {
        id: link.from._internalStateId + link.to._internalStateId,
        source: link.from._internalStateId,
        target: link.to._internalStateId,
        // label: `${conditions.join(" and ")} ${isAre} ${truthy}`,
        label: "",
      },
    };
  });

  return [...fromNodes, ...toNodes, ...edges];
};
