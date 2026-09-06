import api from "./client";
import type { components } from "./types/openapi";

export type PreviewStack = components["schemas"]["PreviewStack"];
export type PreviewStackCreate = components["schemas"]["PreviewStackCreate"];
export type PreviewStackList = components["schemas"]["PreviewStackList"];
export type PreviewStackSync = components["schemas"]["PreviewStackSync"];

export type PreviewPhase = NonNullable<NonNullable<PreviewStack["status"]>["phase"]>;

/**
 * The wire's phase vocabulary, named once so no screen has to spell one as a
 * string literal. `satisfies` keeps it pinned to the generated enum: a phase
 * renamed in the spec fails to compile here rather than silently going unmatched
 * in a `switch` on the other side of the app.
 */
export const PREVIEW_PHASE = {
  provisioning: "Provisioning",
  deploying: "Deploying",
  ready: "Ready",
  failed: "Failed",
  deleting: "Deleting",
} as const satisfies Record<string, PreviewPhase>;

/** Phases where the backend has finished reconciling; polling can stop. */
export const TERMINAL_PHASES: PreviewPhase[] = [PREVIEW_PHASE.ready, PREVIEW_PHASE.failed];

function base(orgId: string, projectName: string): string {
  return `/organizations/${orgId}/projects/${projectName}/preview-stacks`;
}

export interface ListPreviewEnvOpts {
  configId?: string;
  page?: number;
  pageSize?: number;
}

export async function listPreviewEnvs(
  orgId: string,
  projectName: string,
  opts: ListPreviewEnvOpts = {},
): Promise<PreviewStackList> {
  const params: Record<string, string | number> = {};
  if (opts.configId) params.config_id = opts.configId;
  if (opts.page) params.page = opts.page;
  if (opts.pageSize) params.page_size = opts.pageSize;
  const res = await api.get(base(orgId, projectName), { params });
  return res.data as PreviewStackList;
}

/** Fetches every page so callers see the complete env set, not the first 20. */
export async function listAllPreviewEnvs(orgId: string, projectName: string, configId?: string): Promise<PreviewStack[]> {
  const pageSize = 100;
  const items: PreviewStack[] = [];
  for (let page = 1; ; page++) {
    const res = await listPreviewEnvs(orgId, projectName, { configId, page, pageSize });
    const batch = res.items ?? [];
    items.push(...batch);
    const total = res.total ?? items.length;
    if (batch.length === 0 || items.length >= total) break;
  }
  return items;
}

export async function getPreviewEnv(
  orgId: string,
  projectName: string,
  id: string,
): Promise<PreviewStack> {
  const res = await api.get(`${base(orgId, projectName)}/${id}`);
  return res.data as PreviewStack;
}

export async function createPreviewEnv(
  orgId: string,
  projectName: string,
  input: PreviewStackCreate,
): Promise<PreviewStack> {
  const res = await api.post(base(orgId, projectName), input);
  return res.data as PreviewStack;
}

export async function deletePreviewEnv(
  orgId: string,
  projectName: string,
  id: string,
): Promise<PreviewStack> {
  const res = await api.delete(`${base(orgId, projectName)}/${id}`);
  return res.data as PreviewStack;
}

export async function syncPreviewEnv(
  orgId: string,
  projectName: string,
  id: string,
  input: PreviewStackSync = {},
): Promise<PreviewStack> {
  const res = await api.post(`${base(orgId, projectName)}/${id}/sync`, input);
  return res.data as PreviewStack;
}
