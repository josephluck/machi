import React, { useState, useContext, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  makeMachine,
  State,
  Condition,
  isEntry,
} from "@josephluck/machi/src/machine";

import { getCurrentRoute, navigate, reset } from "../navigation";
import { useMachine } from "./machine";

export const makeMachineHooks = <
  Context extends any = void,
  AdditionalEntryData extends {} = never,
  Conditions extends Record<string, Condition<Context>> = Record<
    string,
    Condition<Context>
  >
>({
  states,
  conditions,
  initialContext,
}: {
  states: State<Context, Conditions, AdditionalEntryData>[];
  conditions: Conditions;
  initialContext: Context;
}) => {
  const useMakeMachine = () => {
    const [context, _setContext] = useState<Context>(initialContext);
    const getNextState = makeMachine<Context, AdditionalEntryData, Conditions>(
      states,
      conditions
    );

    const setContext = async (ctx: Context) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
      } catch (err) {
        console.warn(
          "Could not stringify context, it has not been persisted to Async Storage. Machine rehydration probably wont work"
        );
      } finally {
        _setContext(ctx);
      }
    };

    const clearContext = async () => {
      await AsyncStorage.removeItem(STORAGE_KEY);
      _setContext(initialContext);
    };

    const execute = useCallback(
      async (ctx: Context, shouldNavigate = true) => {
        await setContext(ctx);
        const currentRouteName = getCurrentRoute();
        const result = getNextState(ctx, currentRouteName?.name);
        if (!result) {
          console.warn("Next state in machine not found - reached the end.");
        } else if (shouldNavigate) {
          navigate(result.entry.id);
        }
        return result;
      },
      [context, navigate, getNextState]
    );

    return { context, setContext, clearContext, execute, getNextState };
  };

  const MachineContext = React.createContext<ReturnType<typeof useMakeMachine>>(
    {
      context: initialContext,
      setContext: async () => void null,
      clearContext: async () => undefined,
      execute: async () => undefined,
      getNextState: () => void null,
    }
  );

  const MachineProvider = ({ children }: { children: React.ReactNode }) => (
    <MachineContext.Provider value={useMakeMachine()}>
      <MachineInitialiser />
      {children}
    </MachineContext.Provider>
  );

  const useMachine = () => useContext(MachineContext);

  const useInitialiseMachine = () => {
    const { getNextState, setContext } = useMachine();

    useEffect(() => {
      const doEffect = async () => {
        try {
          const persistedContext = await AsyncStorage.getItem(
            STORAGE_KEY
          ).then((str) => (str ? JSON.parse(str) : {}));

          if (persistedContext) {
            setContext(persistedContext);
            const result = getNextState(persistedContext);
            if (result && result.history && result.history.length) {
              console.log("Initialising with history", result);
              const routeIds = [...result.history, result.entry]
                .filter(isEntry)
                .map((entry) => entry.id);
              reset({
                index: routeIds.length - 1,
                routes: routeIds.map((name) => ({ name })),
              });
            } else {
              console.warn("No history found, skipping rehydration");
            }
          } else {
            console.warn("No persisted context found, skipping rehydration");
          }
        } catch (err) {
          console.warn(
            "Failed to retrieve persisted context found, skipping rehydration"
          );
        }
      };
      doEffect();
    }, []);
  };

  const MachineInitialiser = () => {
    useInitialiseMachine();
    return null;
  };

  return {
    MachineProvider,
    useMachine,
  };
};

/**
 * Dirty polls for onboarding state for debugging purposes
 */
export const useOnboardingStorage = () => {
  const [state, setState] = useState<any>();
  const { clearContext } = useMachine();

  useEffect(() => {
    const interval = setInterval(
      () =>
        AsyncStorage.getItem(STORAGE_KEY)
          .then((str) => (str ? JSON.parse(str) : {}))
          .then(setState),
      1000
    );

    return () => clearInterval(interval);
  }, []);

  return {
    clearContext,
    state,
  };
};

const STORAGE_KEY = "ONBOARDING_STATE";
