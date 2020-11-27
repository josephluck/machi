import React, { useState, useContext, useEffect } from "react";
import {
  makeMachine,
  State,
  Condition,
  isEntry,
} from "@josephluck/machi/src/machine";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    const { navigate } = useNavigation();
    const { name: currentRouteName, ...route } = useRoute();
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

    const execute = useCallback(
      async (ctx: Context, shouldNavigate = true) => {
        await setContext(ctx);
        const result = getNextState(ctx, currentRouteName);
        if (!result) {
          console.warn("Next state in machine not found - reached the end.");
        } else if (shouldNavigate) {
          navigate(result.entry.id);
        }
        return result;
      },
      [context, currentRouteName, navigate, getNextState, route]
    );

    return { context, setContext, execute, getNextState };
  };

  const MachineContext = React.createContext<ReturnType<typeof useMakeMachine>>(
    {
      context: initialContext,
      setContext: async () => void null,
      execute: async () => undefined,
      getNextState: () => void null,
    }
  );

  const MachineProvider = ({ children }: { children: React.ReactNode }) => (
    <MachineContext.Provider value={useMakeMachine()}>
      {children}
    </MachineContext.Provider>
  );

  const useMachine = () => useContext(MachineContext);

  const useInitialiseMachine = () => {
    const { getNextState, setContext } = useMachine();
    const { reset } = useNavigation();

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
              const routeIds = result.history
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

  return {
    MachineProvider,
    useMachine,
    useInitialiseMachine,
  };
};

/**
 * Dirty polls for onboarding state for debugging purposes
 */
export const useOnboardingStorage = () => {
  const [state, setState] = useState<any>();

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

  const clear = () => setState(undefined);

  return {
    clear,
    state,
  };
};

const STORAGE_KEY = "ONBOARDING_STATE";
