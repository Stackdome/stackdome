import type { components } from "@/api/types/openapi";

/** The organisation-level role, off the generated schema. */
export type OrgRole = components["schemas"]["UserRole"];

export const ORG_ROLE_ADMIN: OrgRole = "OrgAdmin";
export const ORG_ROLE_MEMBER: OrgRole = "OrgMember";

/**
 * The project-level role a demoted admin lands on.
 *
 * `Owner` exists on the server but is not offered here: demotion moves someone
 * OUT of org-wide authority, and handing them ownership of a project in the
 * same act would take most of it straight back.
 */
export type ProjectRole = "Developer" | "Viewer";

export const PROJECT_ROLE_DEVELOPER: ProjectRole = "Developer";
export const PROJECT_ROLE_VIEWER: ProjectRole = "Viewer";

/** What each org role means, for the field that sets it. */
export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  OrgAdmin: "Org admin",
  OrgMember: "Org member",
};
