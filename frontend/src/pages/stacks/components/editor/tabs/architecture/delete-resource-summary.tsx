import type { EnvRef, ResourceDependents } from "@/pages/stacks/lib/delete-references";

function groupByResource(refs: EnvRef[]): Map<string, string[]> {
  const byResource = new Map<string, string[]>();
  for (const ref of refs) {
    const keys = byResource.get(ref.resource) ?? [];
    keys.push(ref.envName);
    byResource.set(ref.resource, keys);
  }
  return byResource;
}

/** Spans, not divs: this renders inside AlertDialogDescription, which is a `<p>`. */
function SummaryRow({ resource, detail }: { resource: string; detail: string }) {
  return (
    <span className="flex gap-2 text-meta">
      <span className="min-w-[8rem] shrink-0 font-mono text-foreground">{resource}</span>
      <span className="font-mono text-fg-muted">{detail}</span>
    </span>
  );
}

/**
 * **What a delete is about to change, grouped by who has to deal with it.**
 *
 * Written on `main` while this branch was redesigning the canvas, and pulled
 * across at the merge — it lived inside `architecture-tab.tsx`, which this
 * branch had meanwhile emptied into `use-canvas-draft`, so keeping it meant
 * lifting it out rather than picking a side of the conflict. Losing it was the
 * real risk: a plain "this cannot be undone" tells you the act is dangerous and
 * nothing about what it touches.
 *
 * Three groups, and the split is by **who acts**, not by what kind of reference
 * it is: what the delete repairs on its own, what it hands back to you, and
 * what it simply leaves lying there. A service with no dependents says the one
 * sentence and nothing more — §11's rule that the slot is empty exactly when
 * there is nothing to say.
 *
 * Ported as written. The `text-[12.5px]` it carried is `text-meta` here, which
 * is the rung it was reaching for.
 */
export function DeleteResourceSummary({ dependents }: { dependents: ResourceDependents }) {
  const { dependsOn, envRefs, literalRefs, orphanedVolumes } = dependents;
  const consequences = dependsOn.length + envRefs.length + literalRefs.length + orphanedVolumes.length;
  if (consequences === 0) {
    return <>The service and its configuration are removed when the stack deploys. This cannot be undone after deploy.</>;
  }

  const envByResource = groupByResource(envRefs);
  const repaired = new Set([...dependsOn, ...envByResource.keys()]);

  return (
    <span className="flex flex-col gap-3">
      <span>The service is removed when the stack deploys. This cannot be undone after deploy.</span>

      {repaired.size > 0 && (
        <span className="flex flex-col gap-1">
          <span className="text-label font-medium uppercase tracking-wide text-success">Updated automatically</span>
          {[...repaired].map((name) => (
            <SummaryRow
              key={name}
              resource={name}
              detail={[dependsOn.includes(name) && "depends_on", ...(envByResource.get(name) ?? [])]
                .filter(Boolean)
                .join(", ")}
            />
          ))}
        </span>
      )}

      {literalRefs.length > 0 && (
        <span className="flex flex-col gap-1">
          <span className="text-label font-medium uppercase tracking-wide text-warn">Left for you to fix</span>
          {literalRefs.map((ref, i) => (
            <SummaryRow key={i} resource={ref.resource} detail={ref.envName} />
          ))}
        </span>
      )}

      {orphanedVolumes.length > 0 && (
        <span className="flex flex-col gap-1">
          <span className="text-label font-medium uppercase tracking-wide text-fg-muted">Left unattached</span>
          {orphanedVolumes.map((name) => (
            <SummaryRow key={name} resource={name} detail="mounted by nothing" />
          ))}
        </span>
      )}
    </span>
  );
}
