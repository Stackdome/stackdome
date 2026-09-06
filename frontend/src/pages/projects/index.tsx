import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { useProjects } from "./hooks/use-projects";
import { CreateProjectDialog } from "./components/create-project-dialog";
import { ProjectDrawer } from "./components/project-drawer";
import { PageHeader, EmptyState, StackdomeMark } from "@/components/branded";
import { useConfirm } from "@/components/branded/confirm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import type { Project } from "@/api/projects";

export default function ProjectsPage() {
  const { projects, loading, error, refetch, create, rename, remove, onlyDefault } = useProjects();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  /** Which row is open, not a boolean — the drawer is driven by the click, so
   *  there is no second `open` flag to keep in step with it. */
  const [openFor, setOpenFor] = useState<Project | null>(null);

  async function handleCreate(name: string) {
    const result = await create(name);
    if (result.ok) {
      toast({
        title: "Project created",
        description: `"${name}" has been created successfully.`,
        variant: "success",
      });
    }
    return result;
  }

  /**
   * §10 level 3 — a project has dependents, so the gate is the NAME retyped.
   * It used to be a bespoke `DeleteProjectDialog` with its own retype box; the
   * shared confirm has carried that gate since the ladder was written down, and
   * two implementations of one gate is two places for it to drift.
   */
  async function requestDelete(project: Project) {
    const ok = await confirm({
      title: "Delete project?",
      description: `Every stack, addon and secret filed under “${project.name}” is destroyed with it.`,
      confirmLabel: "Delete",
      variant: "destructive",
      gate: { kind: "retype", name: project.name },
    });
    if (!ok) return;
    const result = await remove(project.name);
    if (result.ok) {
      // The object the drawer is about is gone, so the drawer goes with it.
      setOpenFor(null);
      toast({
        title: "Project deleted",
        description: `"${project.name}" has been deleted.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Failed to delete project",
        description: result.error,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Projects"
        actionsAlign="center"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            Create project
          </Button>
        }
      />

      {loading ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {/* Three columns, not four. The trailing track held the row
                  kebab — removing the action means removing its track, its
                  header label and its skeleton cell. */}
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium">Project</TableHead>
                <TableHead className="font-medium">Members</TableHead>
                <TableHead className="font-medium">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="p-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-5 rounded shrink-0" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </TableCell>
                  <TableCell className="p-2"><Skeleton className="h-3 w-24" /></TableCell>
                  <TableCell className="p-2"><Skeleton className="h-3 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : error ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Couldn't load projects"
          description={error}
          action={
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium">Project</TableHead>
                  <TableHead className="font-medium">Members</TableHead>
                  <TableHead className="font-medium">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  /* The row is the one control — it opens the project's drawer.
                     `role="link"` and a key handler, so the hit area is the
                     whole row rather than a control inside it. */
                  <TableRow
                    key={project.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`${project.name} project`}
                    className="cursor-pointer"
                    onClick={() => setOpenFor(project)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setOpenFor(project);
                    }}
                  >
                    <TableCell className="p-2">
                      <div className="flex items-center gap-2">
                        <StackdomeMark size={18} />
                        <span className="font-medium text-body">{project.name}</span>
                        {project.default_project && (
                          <Badge variant="secondary" className="text-label">default</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      {/* A destination inside a row that is itself a
                          destination, so it stops the click reaching the row —
                          otherwise the drawer opens behind the navigation. */}
                      <Link
                        to={`/settings/projects/${encodeURIComponent(project.name)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-body text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Manage members
                      </Link>
                    </TableCell>
                    <TableCell className="p-2 text-body text-muted-foreground">
                      {project.created_at
                        ? format(new Date(project.created_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {onlyDefault && (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No additional projects"
              description="Create projects to organize members and control access to resources across your organization."
              action={
                <Button variant="outline" onClick={() => setCreateOpen(true)}>
                  Create project
                </Button>
              }
            />
          )}
        </>
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      {/* The list stays on screen behind it — which is the whole reason one
          object's detail is a drawer and not a page (§13). */}
      <ProjectDrawer
        project={openFor}
        onOpenChange={(open) => !open && setOpenFor(null)}
        onRename={async (project, newName) => {
          const oldName = project.name;
          const result = await rename(oldName, newName);
          if (result.ok) {
            toast({
              title: "Project renamed",
              description: `"${oldName}" is now "${newName}".`,
              variant: "success",
            });
          }
          return result;
        }}
        onDelete={(project) => void requestDelete(project)}
      />

    </div>
  );
}
