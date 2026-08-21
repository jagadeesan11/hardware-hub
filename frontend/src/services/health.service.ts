import { apiFetch } from './api';

export type HealthResponse = { status: string; uptime: number; timestamp: string };
export type DbHealthResponse = { status: string; database: string; latencyMs?: number; message?: string };

export const getHealth = () => apiFetch<HealthResponse>('/health');

/**
 * A 503 here is a real answer ("Postgres is down, and here's why"), not a
 * failed request — so we read the body instead of throwing.
 */
export const getDbHealth = () => apiFetch<DbHealthResponse>('/health/db', { acceptStatuses: [503] });
