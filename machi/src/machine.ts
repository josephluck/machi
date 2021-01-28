import { stringifyToId, toName } from "./graph/utils";

export type Predicate<Context> = (context: Context) => boolean;

export type ConditionsMap<Context> = Record<string, Condition<Context>>;

/**
 * An entry within the flow. An entry represents a single (potentially) terminal
 * node within the flow
 */
export type Entry<
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData = never
> = AdditionalEntryData extends never
  ? {
      /**
       * Must be unique within the context of a machine
       */
      id: string;
      isDone: (keyof Conditions | Predicate<Context>)[]; // TODO: support both array and single condition
    }
  : AdditionalEntryData & {
      /**
       * Must be unique within the context of a machine
       */
      id: string;
      isDone: (keyof Conditions | Predicate<Context>)[]; // TODO: support both array and single condition
    };

/**
 * A decision in the flow. When all requirements return truthy, the fork's
 * states will be evaluated during execution.
 */
export type Fork<
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
> = {
  fork: string;
  /**
   * Optional name to create a group around this forks sub-groups during chart
   * generation.
   */
  chartGroup?: string;
  requirements: (keyof Conditions | Predicate<Context>)[]; // TODO: support both array and single condition
  states: State<Context, Conditions, AdditionalEntryData>[];
};

/**
 * A single Entry or Fork. The first Entry whose isDone is truthy will be the
 * terminal state in execution.
 */
export type State<
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
> =
  | Fork<Context, Conditions, AdditionalEntryData>
  | Entry<Context, Conditions, AdditionalEntryData>;

/**
 * A predicate based on the machine's context
 */
export type Condition<Context> = (context: Context) => boolean;

export type ExecuteResult<
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
> = {
  entry: Entry<Context, Conditions, AdditionalEntryData>;
  history: State<Context, Conditions, AdditionalEntryData>[];
};

export type ExecuteMachine<
  Context,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData
> = (
  context: Context,
  currentState?: string
) => ExecuteResult<Context, Conditions, AdditionalEntryData> | undefined;

/**
 * Creates a state machine.
 * Returns an initial execution state and history based on the given initial
 * context.
 */
export const makeMachine = <
  Context extends any = void,
  AdditionalEntryData extends {} = never,
  Conditions extends ConditionsMap<Context> = Record<string, Condition<Context>>
>(
  /**
   * The states in the machine.
   */
  states: State<Context, Conditions, AdditionalEntryData>[],
  /**
   * The condition functions (used by states) of the machine. States in the
   * machine can refer to condition functions by their key in this object as
   * entry requirements for a fork or as "done" identifiers for an entry.
   */
  conditions: Conditions
) => {
  type ConditionsResult = Record<keyof Conditions, boolean>;

  type InternalExecuteResult = ExecuteResult<
    Context,
    Conditions,
    AdditionalEntryData
  > & {
    entryInHistory: Entry<Context, Conditions, AdditionalEntryData> | undefined;
  };

  const evaluateConditions = (context: Context) =>
    Object.entries(conditions).reduce(
      (acc, [c, fn]): ConditionsResult => ({
        ...acc,
        [c]: fn(context),
      }),
      {} as ConditionsResult
    );

  const process = (
    context: Context,
    currentEntryName: string | undefined,
    _states: StateInternal<Context, Conditions, AdditionalEntryData>[] = [],
    history: StateInternal<Context, Conditions, AdditionalEntryData>[] = [],
    evaluatedConditions = evaluateConditions(context), // TODO: lazily evaluate conditions when they are encountered for perf, rather than all up front.
    entryInHistory:
      | Entry<Context, Conditions, AdditionalEntryData>
      | undefined = undefined
  ): InternalExecuteResult | undefined => {
    const result = _states.reduce((entryFoundInCurrentLevel, state) => {
      if (isForkEntered(state, context, evaluatedConditions)) {
        if (entryFoundInCurrentLevel) {
          return entryFoundInCurrentLevel;
        }
        history.push(state);
        return process(
          context,
          currentEntryName,
          state.states,
          history,
          evaluatedConditions,
          entryInHistory
        );
      }

      if (isEntryDone(state, context, evaluatedConditions)) {
        // TODO: is this the correct check?
        if (!entryFoundInCurrentLevel) {
          history.push(state);
        }
      }

      if (isEntryNext(state, context, evaluatedConditions)) {
        if (entryFoundInCurrentLevel) {
          // NB: stop recursion here, it's already found
          return entryFoundInCurrentLevel;
        }

        const entriesInHistory = history.filter(isEntryInternal);
        if (currentEntryName && entriesInHistory.length) {
          /**
           * We're trying to find the next closest entry to the entry id passed
           * in to execute. This means the entire state tree will be evaluated as
           * normal, but we'll provide the next closest entry rather than the last
           * entry in the resultant history.
           */
          const currentIndexInHistory = entriesInHistory.findIndex(
            (s) => isEntryInternal(s) && s.id === currentEntryName
          );
          const nextEntryInHistory =
            currentIndexInHistory > -1 &&
            entriesInHistory[currentIndexInHistory + 1];

          if (nextEntryInHistory && isEntryInternal(nextEntryInHistory)) {
            return {
              entry: state,
              history,
              entryInHistory: nextEntryInHistory,
            };
          }
          return {
            entry: state,
            history,
            entryInHistory,
          };
        }

        // NB: this is the first not-done entry
        return {
          entry: state,
          history,
          entryInHistory,
        };
      }

      return entryFoundInCurrentLevel;
    }, undefined as InternalExecuteResult | undefined);

    return result;
  };

  /**
   * Evaluate the next context in the machine given a new state.
   *
   * Provide a current entry id to return the entry immediately after the
   * provided entry in the history stack.
   */
  const execute = (
    /**
     * The next machine context. Passed to conditions to evaluate traversal
     * through the states in the machine.
     */
    context: Context,
    /**
     * Used to determine whether to preserve the history and navigate to the
     * next entry. Used when the current state is somewhere back in the history
     * stack. For example, the user has navigated back to an earlier point in
     * a navigation flow and is updating information (they should go forwards in
     * the same order as they went back, unless they end up changing state entry
     * requirements via data-driven conditions).
     */
    currentEntryName: string | undefined = undefined,
    /**
     * INTERNAL USE ONLY
     * The states to evaluate. Used when recursing over states in the machine.
     */
    _states: StateInternal<
      Context,
      Conditions,
      AdditionalEntryData
    >[] = uniquifyStates(states),
    /**
     * INTERNAL USE ONLY
     * Used when recursing over states whose conditions return truthy (aka the
     * states that have been "visited" on the way to the final state) to build
     * up the pathway of visited states during execution.
     */
    _history: EntryInternal<Context, Conditions, AdditionalEntryData>[] = [],
    /**
     * INTERNAL USE ONLY
     * Used as a cache of the condition results based on the next context so
     * that the conditions aren't re-evaluated during recursion.
     */
    _evaluatedConditions = evaluateConditions(context),
    _entryInHistory:
      | Entry<Context, Conditions, AdditionalEntryData>
      | undefined = undefined
  ): ExecuteResult<Context, Conditions, AdditionalEntryData> | undefined => {
    const result = process(
      context,
      currentEntryName,
      _states,
      _history,
      _evaluatedConditions,
      _entryInHistory
    );

    if (!result) {
      return;
    }

    const { entry, entryInHistory, ...rest } = result;

    return { ...rest, entry: entryInHistory || entry };
  };

  return execute;
};

export const isFork = <
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
>(
  state: State<Context, Conditions, AdditionalEntryData>
): state is Fork<Context, Conditions, AdditionalEntryData> =>
  typeof state === "object" &&
  state.hasOwnProperty("fork") &&
  state.hasOwnProperty("states") &&
  !state.hasOwnProperty("id");

export const isEntry = <
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
>(
  state: State<Context, Conditions, AdditionalEntryData>
): state is Entry<Context, Conditions, AdditionalEntryData> => !isFork(state);

export const isForkInternal = <
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
>(
  state: StateInternal<Context, Conditions, AdditionalEntryData>
): state is ForkInternal<Context, Conditions, AdditionalEntryData> =>
  isFork(state as Fork<Context, Conditions, AdditionalEntryData>);

export const isEntryInternal = <
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
>(
  state: StateInternal<Context, Conditions, AdditionalEntryData>
): state is EntryInternal<Context, Conditions, AdditionalEntryData> =>
  !isFork(state as Fork<Context, Conditions, AdditionalEntryData>);

/**
 * Returns a boolean representing whether the provided state is a fork and
 * whether it should be executed according to the current context.
 */
export const isForkEntered = <
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
>(
  state: StateInternal<Context, Conditions, AdditionalEntryData>,
  context: Context,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is ForkInternal<Context, Conditions, AdditionalEntryData> =>
  isForkInternal<Context, Conditions, AdditionalEntryData>(state) &&
  state.requirements.every((condition) =>
    isConditionKey<Conditions, Context>(condition)
      ? evaluatedConditions[condition]
      : condition(context)
  );

/**
 * Returns a boolean representing whether the provided state is an entry state
 * and whether it is considered to be "done" according to the current context.
 */
export const isEntryDone = <
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
>(
  state: StateInternal<Context, Conditions, AdditionalEntryData>,
  context: Context,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is EntryInternal<Context, Conditions, AdditionalEntryData> =>
  isEntryInternal<Context, Conditions, AdditionalEntryData>(state) &&
  state.isDone.every((condition) =>
    isConditionKey<Conditions, Context>(condition)
      ? evaluatedConditions[condition]
      : condition(context)
  );

/**
 * Returns a boolean representing whether the provided state is an entry state
 * and whether it is considered to be the next entry according to the current
 * context.
 */
export const isEntryNext = <
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
>(
  state: StateInternal<Context, Conditions, AdditionalEntryData>,
  context: Context,
  evaluatedConditions: Record<keyof Conditions, boolean>
): state is EntryInternal<Context, Conditions, AdditionalEntryData> =>
  isEntryInternal<Context, Conditions, AdditionalEntryData>(state) &&
  state.isDone.some((condition) =>
    isConditionKey(condition)
      ? !evaluatedConditions[condition]
      : !condition(context)
  );

export const isConditionKey = <Conditions, Context>(
  key: keyof Conditions | Predicate<Context>
): key is keyof Conditions => typeof key === "string";

export type EntryInternal<
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
> = Entry<Context, Conditions, AdditionalEntryData> & {
  _internalStateId: string;
};

export type ForkInternal<
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
> = Omit<Fork<Context, Conditions, AdditionalEntryData>, "states"> & {
  states: StateInternal<Context, Conditions, AdditionalEntryData>[];
  _internalStateId: string;
  _internalVariantId: string;
};

export type StateInternal<
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
> =
  | EntryInternal<Context, Conditions, AdditionalEntryData>
  | ForkInternal<Context, Conditions, AdditionalEntryData>;

/**
 * Takes a (potentially) deeply nested set of states and returns a copy of them
 * with unique ids.
 *
 * This allows the same entry to be used within multiple forks without needing
 * to have unique ids.
 */
export const uniquifyStates = <
  Context extends any,
  Conditions extends ConditionsMap<Context>,
  AdditionalEntryData extends {} = {}
>(
  states: State<Context, Conditions, AdditionalEntryData>[],
  parentId = ""
): StateInternal<Context, Conditions, AdditionalEntryData>[] =>
  states.map((state, ix) => {
    if (isFork(state)) {
      const _internalStateId = `${stringifyToId(
        toName(state as ForkInternal<Context, Conditions, AdditionalEntryData>)
      )}${parentId}`;
      return {
        ...state,
        states: uniquifyStates(state.states, _internalStateId),
        _internalStateId,
        _internalVariantId: ix.toString(),
      } as ForkInternal<Context, Conditions, AdditionalEntryData>;
    }
    const _internalStateId = `${stringifyToId(
      toName(state as EntryInternal<Context, Conditions, AdditionalEntryData>)
    )}${parentId}`;
    return {
      ...state,
      _internalStateId,
    } as EntryInternal<Context, Conditions, AdditionalEntryData>;
  });
