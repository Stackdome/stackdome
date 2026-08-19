import api from "./client"; // Changed to default import
import type { components } from "./types/openapi";
import type { StackList } from "@/api/stack-types";

export type Stack = components["schemas"]["Stack"];
export type StackLifecycle = components["schemas"]["StackLifecycle"];
export type StackResource = components["schemas"]["StackResource"];
export type StackResourceList = components["schemas"]["StackResourceList"];
export type Volume = components["schemas"]["Volume"];
export type VolumeMount = components["schemas"]["VolumeMount"];

// Create update request types that exclude read-only fields
export type VolumeMountUpdateRequest = Omit<VolumeMount,
  'stack_resource_id' | 'source_volume_type'
>;

export type StackResourceUpdateRequest = Omit<StackResource,
  'id' | 'stack_id' | 'revision'
> & {
  volume_mounts?: VolumeMountUpdateRequest[];
};

export type VolumeUpdateRequest = Omit<Volume,
  'id' | 'status'
>;

export type StackUpdateRequest = Omit<Stack,
  'id' | 'organisation_id' | 'user_id' | 'namespace' | 'revision' | 'lifecycle' | 'converged_release' | 'latest_release' | 'created_at' | 'updated_at'
> & {
  spec: {
    stack_resources: StackResourceUpdateRequest[];
    volumes?: VolumeUpdateRequest[];
    connections?: components["schemas"]["StackConnection"][];
  };
};

export async function getStacksByOrg(orgId: string): Promise<StackList> {
  const response = await api.get<StackList>(
    `/organizations/${orgId}/stacks`
  );
  return response.data;
}

// Writes go through project-scoped endpoints (the org-scoped paths are GET-only).
export async function createStack(orgId: string, projectName: string, input: Stack): Promise<Stack> {
  const response = await api.post(`/organizations/${orgId}/projects/${projectName}/stacks`, input);
  return response.data;
}

// Single-stack reads are project-scoped (only the org-level *list* is aggregated);
// the UI scopes to the default project.
export async function getStackById(orgId: string, projectName: string, stackId: string): Promise<Stack> {
  const response = await api.get<Stack>(`/organizations/${orgId}/projects/${projectName}/stacks/${stackId}`);
  return response.data;
}

export async function updateStack(orgId: string, projectName: string, stackId: string, input: StackUpdateRequest): Promise<Stack> {
  const response = await api.put<Stack>(`/organizations/${orgId}/projects/${projectName}/stacks/${stackId}`, input);
  return response.data;
}

/**
 * Rename a stack, and nothing else.
 *
 * Goes through the **shell** PUT, which updates the stack's own columns and
 * ignores any children in the payload — so a rename can never carry a stray
 * resource edit with it. The spec is sent because the request type requires
 * one; the server strips it.
 *
 * The name is the only mutable identity a stack has. Its Kubernetes namespace
 * keeps the old name as a prefix (it is `<name>-<uuid>` and create-only), which
 * is invisible outside `kubectl`, and the Stack CR under the old name is pruned
 * by the next apply.
 */
export async function renameStack(
  orgId: string,
  projectName: string,
  stack: Stack,
  name: string,
): Promise<Stack> {
  return updateStack(orgId, projectName, stack.id as string, {
    ...(stack as unknown as StackUpdateRequest),
    name,
    spec: { stack_resources: [] },
  });
}

// Declarative reconcile: the only endpoint that accepts a full stack document
// (resources/volumes/connections inline). POST/PUT stacks ignore inline children.
export async function applyStack(orgId: string, projectName: string, stackId: string, input: StackUpdateRequest): Promise<Stack> {
  const response = await api.put<Stack>(`/organizations/${orgId}/projects/${projectName}/stacks/${stackId}/apply`, input);
  return response.data;
}

// Name-addressed declarative upsert (kubectl-style): stack identity is the
// body's name, unique per project. Missing -> creates the stack and its children
// atomically (201); existing -> reconciles like applyStack (200). A server-side
// validation failure persists nothing, so retrying after a fix just works.
export async function applyStackByName(orgId: string, projectName: string, input: Stack): Promise<Stack> {
  const response = await api.put<Stack>(`/organizations/${orgId}/projects/${projectName}/stacks/apply`, input);
  return response.data;
}

export async function deleteStack(orgId: string, projectName: string, stackId: string): Promise<void> {
  await api.delete(`/organizations/${orgId}/projects/${projectName}/stacks/${stackId}`);
}
