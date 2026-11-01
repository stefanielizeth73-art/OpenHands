import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";
import { useActiveBackend } from "./active-backend-context";

interface HomeModelPick {
  scope: string;
}

interface HomeModelPickState {
  markPick: (scope: string) => void;
  getPick: (scope: string) => HomeModelPick | null;
  consumePick: (pick: HomeModelPick | null) => void;
  discardOtherScope: (scope: string) => void;
}

export const HomeModelPickContext = createContext<HomeModelPickState | null>(
  null,
);

export function getHomeModelPickScope(
  backendId: string,
  orgId: string | null | undefined,
  connectionRevision: number | undefined,
  agentProfileId: string | null | undefined,
) {
  return JSON.stringify([backendId, orgId, connectionRevision, agentProfileId]);
}

export function HomeModelPickProvider({ children }: PropsWithChildren) {
  const { backend, orgId } = useActiveBackend();
  const backendScope = JSON.stringify([
    backend.id,
    orgId,
    backend.connectionRevision,
  ]);
  const pending = useRef<HomeModelPick | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [backendScope]);

  const value = useMemo<HomeModelPickState>(
    () => ({
      markPick: (scope) => {
        pending.current = { scope };
      },
      getPick: (scope) =>
        pending.current?.scope === scope ? pending.current : null,
      consumePick: (pick) => {
        if (pending.current === pick) pending.current = null;
      },
      discardOtherScope: (scope) => {
        if (pending.current?.scope !== scope) pending.current = null;
      },
    }),
    [],
  );

  return (
    <HomeModelPickContext.Provider value={value}>
      {children}
    </HomeModelPickContext.Provider>
  );
}
