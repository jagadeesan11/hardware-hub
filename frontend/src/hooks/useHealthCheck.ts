import { useCallback, useEffect, useState } from 'react';
import { getDbHealth, getHealth, type DbHealthResponse, type HealthResponse } from '../services/health.service';

type State = {
  api: HealthResponse | null;
  db: DbHealthResponse | null;
  /** Set only when the API itself is unreachable — a down database is not a check failure. */
  apiError: string | null;
  isLoading: boolean;
};

const initialState: State = { api: null, db: null, apiError: null, isLoading: true };

/** Verifies the full React -> Vite proxy -> Express -> Prisma -> Postgres path. */
export function useHealthCheck() {
  const [state, setState] = useState<State>(initialState);

  const check = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, apiError: null }));

    // allSettled, not all: the two checks report independently, so a dead
    // database still lets us show that the API layer is alive.
    const [apiResult, dbResult] = await Promise.allSettled([getHealth(), getDbHealth()]);

    setState({
      api: apiResult.status === 'fulfilled' ? apiResult.value : null,
      db: dbResult.status === 'fulfilled' ? dbResult.value : null,
      apiError:
        apiResult.status === 'rejected'
          ? apiResult.reason instanceof Error
            ? apiResult.reason.message
            : 'Unknown error'
          : null,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return { ...state, refetch: check };
}
