import { useState } from "react";
import { Search, Users, UserX } from "lucide-react";
import { useUsers } from "./hooks/use-users";
import { useProjectOptions } from "./hooks/use-project-options";
import { InviteDialog } from "./components/invite-dialog";
import type { PendingRow as PendingRowModel, UserRowModel } from "./hooks/use-users";
import { UserRow } from "./components/user-row";
import { PendingRow } from "./components/pending-row";
import { MemberDrawer } from "./components/member-drawer";
import { useInvites } from "./hooks/use-invites";
import { PageHeader, EmptyState } from "@/components/branded";
import { useConfirm } from "@/components/branded/confirm";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RoleTab = "all" | "active" | "invited";

function hasActiveFilters(search: string, roleTab: RoleTab, project: string): boolean {
  return search.trim() !== "" || roleTab !== "all" || project !== "all";
}

function filterRows(
  rows: UserRowModel[],
  search: string,
  roleTab: RoleTab,
  project: string,
): UserRowModel[] {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    // Role tab filter
    if (roleTab === "active" && row.kind !== "active") return false;
    if (roleTab === "invited" && row.kind !== "pending") return false;

    // Search filter (name/email)
    if (q) {
      if (row.kind === "active") {
        if (!row.name.toLowerCase().includes(q) && !row.email.toLowerCase().includes(q)) {
          return false;
        }
      } else {
        if (!row.email.toLowerCase().includes(q)) return false;
      }
    }

    // Project filter
    if (project !== "all") {
      if (row.kind === "active") {
        if (!row.projects.some((t) => t.project_name === project)) return false;
      } else {
        if (row.project_name !== project) return false;
      }
    }

    return true;
  });
}

function TabCount({ count }: { count: number }) {
  return <span className="ml-1.5 font-mono text-label text-muted-foreground">{count}</span>;
}

export default function UsersPage() {
  const { rows, loading, error, refetch } = useUsers();
  const { projects: projectOptions } = useProjectOptions();
  const [search, setSearch] = useState("");
  const [roleTab, setRoleTab] = useState<RoleTab>("all");
  const [project, setProject] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  /** Which row is open, not a boolean — the drawer is driven by the click, so
   *  there is no second `open` flag to keep in step with it. */
  const [openFor, setOpenFor] = useState<UserRowModel | null>(null);
  const { revoke } = useInvites();
  const confirm = useConfirm();
  const { toast } = useToast();

  const allProjects = projectOptions.map((t) => t.name).sort();
  const filtered = filterRows(rows, search, roleTab, project);
  const filtersActive = hasActiveFilters(search, roleTab, project);

  // Tab counts
  const countAll = rows.length;
  const countActive = rows.filter((r) => r.kind === "active").length;
  const countInvited = rows.filter((r) => r.kind === "pending").length;

  // Default project name for chip star
  const defaultProjectName = projectOptions.find((t) => t.default_project)?.name;

  /**
   * §10 level 2 — an unaccepted invite is rebuildable and nothing references
   * it, so the gate is an acknowledgement rather than the name retyped, and the
   * trigger stays on the drawer's header band rather than in a danger zone.
   */
  async function requestRevoke(row: PendingRowModel) {
    const ok = await confirm({
      title: "Revoke this invite?",
      description: `The link sent to ${row.email} stops working. Inviting them again sends a new one.`,
      confirmLabel: "Revoke",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await revoke(row.id);
      // The object the drawer is about is gone, so the drawer goes with it.
      setOpenFor(null);
      toast({
        title: "Invite revoked",
        description: `The invite for ${row.email} has been revoked.`,
        variant: "success",
      });
      refetch();
    } catch (e: unknown) {
      toast({
        title: "Failed to revoke invite",
        description: e instanceof Error ? e.message : "The invite could not be revoked.",
        variant: "destructive",
      });
    }
  }

  function clearFilters() {
    setSearch("");
    setRoleTab("all");
    setProject("all");
  }

  /* Four columns, not five. The trailing track held the row kebab — removing
     the action means removing its track, its (blank) header cell and its
     skeleton cell. */
  const tableHeader = (
    <TableRow className="hover:bg-transparent">
      <TableHead>User</TableHead>
      <TableHead>Org role</TableHead>
      <TableHead>Projects</TableHead>
      <TableHead>Last active</TableHead>
    </TableRow>
  );

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Users"
        subtitle="Everyone in this organisation. Org-admins can manage roles and project memberships."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            Invite user
          </Button>
        }
      />

      {/* States */}
      {loading ? (
        <div>
          {/* Toolbar skeleton */}
          <div className="pb-3 flex items-center gap-2 flex-wrap">
            <Skeleton className="h-8 w-[280px]" />
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-8 w-[180px]" />
          </div>
          <div>
            <Table>
              <TableHeader>{tableHeader}</TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-7 w-7 rounded shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-2.5 w-36" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-3 w-16" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : error ? (
        <EmptyState
          icon={<UserX className="h-8 w-8" />}
          title="Couldn't load users"
          description={error}
          action={
            <Button variant="outline" shape="flat" onClick={refetch}>
              Retry
            </Button>
          }
        />
      ) : filtered.length === 0 && !filtersActive ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No users yet"
          description="Invite your first projectmate to get started."
          action={
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              Invite user
            </Button>
          }
        />
      ) : (
        <div>
          {/* Toolbar — grouped left, no box around it either. */}
          <div className="pb-3 flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-[280px]"
                size="sm"
              />
            </div>

            {/* Tabs */}
            <Tabs value={roleTab} onValueChange={(v) => setRoleTab(v as RoleTab)}>
              <TabsList>
                <TabsTrigger value="all">
                  All<TabCount count={countAll} />
                </TabsTrigger>
                <TabsTrigger value="active">
                  Active<TabCount count={countActive} />
                </TabsTrigger>
                <TabsTrigger value="invited">
                  Invited<TabCount count={countInvited} />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Project filter */}
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {allProjects.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            {filtered.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground" />
                <p className="text-body text-muted-foreground">No users match these filters</p>
                <Button variant="outline" size="sm" shape="flat" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>{tableHeader}</TableHeader>
                <TableBody>
                  {filtered.map((row) =>
                    row.kind === "pending" ? (
                      <PendingRow
                        key={row.id}
                        row={row}
                        defaultProjectName={defaultProjectName}
                        onOpen={setOpenFor}
                      />
                    ) : (
                      <UserRow
                        key={row.id}
                        row={row}
                        defaultProjectName={defaultProjectName}
                        onOpen={setOpenFor}
                      />
                    ),
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* The list stays on screen behind it — which is the whole reason one
          object's detail is a drawer and not a page (§13). */}
      <MemberDrawer
        row={openFor}
        onOpenChange={(open) => !open && setOpenFor(null)}
        onChanged={refetch}
        onRevoke={(row) => void requestRevoke(row)}
      />

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onCreated={refetch}
      />
    </div>
  );
}
