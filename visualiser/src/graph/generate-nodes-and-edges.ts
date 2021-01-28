import {
  REASONS,
  StateLink,
} from "@josephluck/machi/src/graph/generate-state-links";
import { condNames } from "@josephluck/machi/src/graph/utils";
import {
  isEntryInternal,
  isForkInternal,
  StateInternal,
} from "@josephluck/machi/src/machine";
import { HiddenFork } from "..";

export type GraphNode = {
  id: string;
  label: string;
  visible: boolean;
};

export type GraphEdge = {
  from: string;
  to: string;
  label: string;
  visible: boolean;
};

export const generateNodesAndEdges = (
  links: StateLink<any, any, {}>[],
  hiddenIds: string[],
  hiddenForks: HiddenFork[]
): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const isVisible = (state: StateInternal<any, any, {}>) =>
    isEntryInternal(state)
      ? !hiddenIds.includes(state._internalStateId)
      : !(
          hiddenForks.find(
            (f) =>
              f._internalStateId === state._internalStateId &&
              f._internalVariantId === state._internalVariantId
          ) || hiddenIds.includes(state._internalStateId)
        );

  const stateToNode = (state: StateInternal<any, any, {}>): GraphNode => ({
    id: state._internalStateId,
    label: isForkInternal(state) ? state.fork : state.id,
    visible: isVisible(state),
  });

  const fromNodes = links.map((link) => stateToNode(link.from));

  const toNodes = links.map((link) => stateToNode(link.to));

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
      from: link.from._internalStateId,
      to: link.to._internalStateId,
      label: `${conditions.join(" and ")} ${isAre} ${truthy}`,
      visible: isVisible(link.to) && isVisible(link.from),
    };
  });

  return {
    nodes: [...fromNodes, ...toNodes],
    edges,
  };
};
