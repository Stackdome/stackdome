import { useEffect, useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertBanner,
  BlockedAction,
  DetailList,
  DetailRow,
  FieldShell,
  reasonList,
} from "@/components/branded";
import { copyText } from "@/lib/clipboard";
import { useToast } from "@/components/ui/use-toast";
import { ProjectChip } from "./project-chip";
import { useUserActions } from "../hooks/use-user-actions";
import { useProjectOptions } from "../hooks/use-project-options";
import { useInvites } from "../hooks/use-invites";
import { formatRelative } from "../lib/format-relative";
import {
  ORG_ROLE_ADMIN,
  ORG_ROLE_LABELS,
  ORG_ROLE_MEMBER,
  PROJECT_ROLE_DEVELOPER,
  PROJECT_ROLE_VIEWER,
  type OrgRole,
  type ProjectRole,
} from "../lib/roles";
import type { UserRowModel } from "../hooks/use-users";

/**
 * **One person in the organisation, and everything you can do to them.**
 *
 * It replaces two row kebabs. The active one held `Promote`, `Demote` and
 * `Copy ID` — and `Demote` opened **two selects and a Confirm/Cancel pair
 * inside the dropdown**, a form built in a menu, 200px wide, that closed if the
 * pointer wandered. The pending one held `Resend` and `Revoke`. Between them
 * they cost every row a trailing column to hold a trigger.
 *
 * ### The two arms are two different surfaces
 *
 * A **member** has a setting: which org role they hold, and — when that role
 * comes down — which project they land in and at what level. That is a form,
 * with a footer that commits it.
 *
 * A **pending invite** has no settings at all. It is a fact you read and two
 * acts you take on it, so it takes the preview drawer's shape: the acts ride
 * the header, the body is a flat list, and there is no footer because there is
 * nothing to commit.
 *
 * ### Neither arm has a danger zone
 *
 * There is no API for removing a member, so inventing a block headed *Danger
 * zone* for an act the product cannot perform would be a warning about nothing.
 * And §10's table puts *revoke a pending invite* squarely on the "no" side: it
 * destroys an unaccepted invitation, nothing references it, and `Invite user`
 * makes another. So the trash rides the header, exactly as it does on a preview
 * environment.
 */
export function MemberDrawer({
  row,
  onOpenChange,
  onChanged,
  onRevoke,
}: {
  /** `null` closes it. Driven by which row was clicked, so there is no second
   *  `open` prop to keep in step with it. */
  row: UserRowModel | null;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful change so the page can refresh the list. */
  onChanged: () => void;
  /** Runs the confirm and the revoke. Owned by the page, because the drawer
   *  has to close when the object it is about stops existing. */
  onRevoke: (row: UserRowModel & { kind: "pending" }) => void;
}) {
  const { toast } = useToast();
  const { promote, demote } = useUserActions();
  const { projects } = useProjectOptions();
  const { resend } = useInvites();

  const [role, setRole] = useState<OrgRole>(ORG_ROLE_MEMBER);
  const [project, setProject] = useState("");
  const [projectRole, setProjectRole] = useState<ProjectRole>(PROJECT_ROLE_DEVELOPER);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rowId = row?.id;
  const currentRole = row?.kind === "active" ? row.role : undefined;
  useEffect(() => {
    if (rowId == null) return;
    setRole((currentRole as OrgRole) ?? ORG_ROLE_MEMBER);
    setProject("");
    setProjectRole(PROJECT_ROLE_DEVELOPER);
    setError(null);
    setSaving(false);
    // Keyed on the id, not the object: a refetched list must not wipe an
    // in-progress edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId]);

  if (!row) return null;

  if (row.kind === "pending") {
    const handleResend = async () => {
      if (busy) return;
      setBusy(true);
      try {
        await resend(row.id);
        toast({
          title: "Invite resent",
          description: `Resent invite to ${row.email}.`,
          variant: "success",
        });
        onChanged();
      } catch (e: unknown) {
        toast({
          title: "Failed to resend invite",
          description: e instanceof Error ? e.message : "The invite could not be sent again.",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    };

    return (
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerContent size="form">
          <DrawerHeader
            title={row.email}
            description="Pending invite"
            trailing={
              <>
                <HeaderAction label="Resend invite" onClick={() => void handleResend()} busy={busy}>
                  <Send aria-hidden />
                </HeaderAction>
                {/* **The trash is on the band, not in a danger zone** (§10). An
                    unaccepted invite has no dependents and `Invite user` makes
                    another — the same argument that keeps a preview
                    environment's delete in its header. */}
                <HeaderAction label="Revoke invite" onClick={() => onRevoke(row)}>
                  <Trash2 aria-hidden />
                </HeaderAction>
              </>
            }
          />

          <DrawerBody>
            <DetailList>
              <DetailRow label="Delivery">
                {row.email_sent === false ? (
                  <span className="text-danger">Email could not be sent</span>
                ) : (
                  "Email sent"
                )}
              </DetailRow>
              <DetailRow label="Project">
                {row.project_name ? (
                  <ProjectChip
                    membership={{ project_name: row.project_name, role: row.role }}
                  />
                ) : undefined}
              </DetailRow>
              <DetailRow label="Invited by">{row.invited_by}</DetailRow>
              <DetailRow label="Invited">{formatRelative(row.invite.created_at)}</DetailRow>
              <DetailRow label="Expires">{formatRelative(row.expires_at)}</DetailRow>
            </DetailList>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  const demoting = role === ORG_ROLE_MEMBER && currentRole === ORG_ROLE_ADMIN;
  const changed = role !== currentRole;

  /** The primary refuses before the click rather than after it, and names what
   *  is still missing in the verb of the act (§9). */
  const missing = () => {
    const out: string[] = [];
    if (!changed) out.push("Change the role to save");
    if (demoting && !project) out.push("Pick the project they keep access to");
    return reasonList(out);
  };

  const save = async () => {
    if (!changed) return;
    setSaving(true);
    setError(null);
    const result =
      role === ORG_ROLE_ADMIN
        ? await promote(row.id)
        : await demote(row.id, project, projectRole);
    if (result.ok) {
      toast({
        title: role === ORG_ROLE_ADMIN ? "User promoted" : "User demoted",
        description: `${row.name} is now ${ORG_ROLE_LABELS[role].toLowerCase()}.`,
        variant: "success",
      });
      onOpenChange(false);
      onChanged();
    } else {
      // Kept on the surface: the selects that produced it are still on screen.
      setError(result.error);
    }
    setSaving(false);
  };

  const copyId = async () => {
    await copyText(row.id);
    toast({ title: "User ID copied", variant: "success" });
  };

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        {/* The name is who; the email is the machine string that says which one
            (§6). Same name-then-meta pair the row carries. */}
        <DrawerHeader
          title={row.name}
          description={<span className="font-mono">{row.email}</span>}
        />

        <DrawerBody>
          <FieldShell
            label="Organisation role"
            help="An org admin sees and manages every project. An org member sees only the projects they are added to."
          >
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ORG_ROLE_ADMIN}>{ORG_ROLE_LABELS[ORG_ROLE_ADMIN]}</SelectItem>
                <SelectItem value={ORG_ROLE_MEMBER}>{ORG_ROLE_LABELS[ORG_ROLE_MEMBER]}</SelectItem>
              </SelectContent>
            </Select>
          </FieldShell>

          {/* **Only when the role is coming down.** Losing org-wide authority
              means landing somewhere, and the API will not take the demotion
              without both answers — so the two fields appear with the decision
              that needs them rather than sitting greyed out beside it. They
              pair by meaning: one project, one level in it. */}
          {demoting && (
            <div className="grid grid-cols-2 gap-4">
              <FieldShell label="Project" htmlFor="member-project" required span={1}>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger id="member-project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id ?? p.name} value={p.name ?? ""}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Project role" htmlFor="member-project-role" required span={1}>
                <Select
                  value={projectRole}
                  onValueChange={(v) => setProjectRole(v as ProjectRole)}
                >
                  <SelectTrigger id="member-project-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROJECT_ROLE_DEVELOPER}>{PROJECT_ROLE_DEVELOPER}</SelectItem>
                    <SelectItem value={PROJECT_ROLE_VIEWER}>{PROJECT_ROLE_VIEWER}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
            </div>
          )}

          <DetailList className="mt-1">
            <DetailRow label="Projects">
              {row.projects.length > 0 ? (
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {row.projects.map((p, i) => (
                    <ProjectChip key={p.project_id ?? i} membership={p} />
                  ))}
                </div>
              ) : undefined}
            </DetailRow>
            <DetailRow label="User ID">
              <span className="min-w-0 truncate font-mono text-meta" title={row.id}>
                {row.id}
              </span>
              {/* `outline` — the board's `secondary`. It is the one control in
                  this list, and a ghost among plain text reads as absent until
                  you hover it. */}
              <Button
                variant="outline"
                shape="flat"
                className="ml-auto flex-none"
                onClick={() => void copyId()}
              >
                Copy
              </Button>
            </DetailRow>
          </DetailList>
        </DrawerBody>

        <DrawerFooter>
          {/* In the footer band, not the body. Inside a band that scrolls, a
              failure scrolls away from the button that produced it. */}
          {error && <AlertBanner>{error}</AlertBanner>}
          <DrawerActions>
            <BlockedAction reason={saving ? null : missing()}>
              <Button onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Save role
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * One of the header band's object actions — a glyph, and its verb in a tooltip.
 *
 * **An icon button's only label is its glyph**, so the word has to come from
 * somewhere. The same shape the addon and preview drawers use.
 */
function HeaderAction({
  label,
  onClick,
  busy,
  children,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={onClick}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
