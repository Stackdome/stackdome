import { ExternalLink } from "lucide-react"

import { PickerList, PickerRow, PickerRowTick } from "@/components/branded"
import { Button } from "@/components/ui/button"
import { templates } from "@/pages/stacks/data/templates/registry"
import type { Template } from "@/pages/stacks/data/templates/types"

import { templateServices } from "../template-services"
import { TemplateLogo } from "../template-logo"

/**
 * `v2.27.4`, once.
 *
 * Three of the seven records already carry the `v` and four do not — prefixing
 * blindly printed `vv3.20.189-lts`. Normalising here rather than editing the
 * records keeps a template's `version` the value its upstream publishes.
 */
function versionLabel(version: string) {
  return `v${version.replace(/^v/i, "")}`
}

/**
 * The curated apps. One list, and a detail panel that appears with the first
 * pick — the same rule the "In this stack" panel follows.
 *
 * The detail shows **every field the record actually carries** — category,
 * version, the long blurb, the website and the docs. The old browser panel
 * showed all of it and an earlier pass of this redesign showed none of it,
 * which quietly made the templates less useful than the thing being replaced.
 */
export function TemplateTab({
  picked,
  onPick,
}: {
  picked: Template | null
  onPick: (template: Template) => void
}) {
  // **No search.** Seven apps fit one screen, so the field could only ever hide
  // a row already visible — and it cost a zero-result empty state that existed
  // purely to recover from using it. Same call as the addon catalogue; it comes
  // back with the scroll that justifies it.
  return (
    <div className="flex flex-col gap-3">
      <PickerList aria-label="Ready-made apps">
        {templates.map((template) => {
          const services = templateServices(template)
          return (
            <PickerRow
              key={template.id}
              icon={<TemplateLogo template={template} />}
              name={template.name}
              // **The description alone.** The row carried the version too,
              // and in the drawer's 339 column that is a line competing with
              // itself: both halves truncated, and `v3.…` is a version number
              // with the number taken off. The detail panel beside it prints
              // the full version the moment a row is picked, which is the
              // only point at which it means anything.
              meta={[{ text: template.shortDescription }]}
              endText={`${services.length} ${services.length === 1 ? "service" : "services"}`}
              selected={picked?.id === template.id}
              trailing={picked?.id === template.id ? <PickerRowTick /> : null}
              onClick={() => onPick(template)}
            />
          )
        })}
      </PickerList>
    </div>
  )
}

/** The right-hand detail for the picked app. Rendered by the page beside the
 *  list, in the same slot the "In this stack" panel uses. */
export function TemplateDetail({ template }: { template: Template }) {
  const services = templateServices(template)
  return (
    <aside className="border-border-subtle sticky top-0 w-60 flex-none self-start border-l pl-5">
      {/**
       * **The logo tile is the sheet, lifted — not a control fill.**
       *
       * It was `bg-control`, the same recessed grey the picker rows' chips use.
       * That is the right material for a chip INSIDE a row, where the tile is
       * one element among several on a shared ground. Here the tile is the
       * first thing in the rail and the thing the whole panel is about, so it
       * reads better raised off the surface than pressed into it.
       *
       * Same fill as the drawer it sits on, so the hairline and `shadow-sm`
       * are doing all the work — which is the point. `elevation/sm` on the
       * board: `0 1px 2px` at 3.5% in light, and the token already carries the
       * much heavier dark value a near-black ground needs.
       */}
      <span className="border-border bg-popover flex size-11 items-center justify-center rounded-lg border shadow-sm">
        <TemplateLogo template={template} size={26} />
      </span>
      <h2 className="text-title text-foreground mt-2.5 font-medium">{template.name}</h2>
      {/* The category is a word, so it is set in the interface face. Only the
          version is a machine value, and only it takes mono (§6).

          Flush against the name — 0 is the pair rung (§8). At `title/500` the
          line box already carries its own leading between the two cap heights,
          so a gap on top of it separates what should read as one block. */}
      <p className="text-label text-fg-muted">
        {template.category} · <span className="font-mono">{versionLabel(template.version)}</span>
      </p>
      {/* The token's own 16, not an 18px override. The description is `meta`
          and every rung on the scale is a multiple of 4 (§6). */}
      <p className="text-meta text-fg-2 mt-2">{template.longDescription}</p>
      {/**
       * **Both links leave the product, and both say so.**
       *
       * The trailing glyph is the whole difference between a button that acts
       * here and one that opens a new tab — and `Website` and `Docs` are the
       * only two controls in this journey that do the second thing. Without it
       * they read as steps in the flow, which is the one thing they are not.
       *
       * Trailing, not leading: it modifies the destination rather than naming
       * the thing, so it belongs after the word it qualifies. `Button` already
       * pays the optical correction for an icon on one side only — 14 of
       * padding before the label, 9 after the glyph — so nothing is set here.
       *
       * 32, not the 28 this used to be. They sit in a rail, not in a dense row.
       */}
      <div className="mt-3 flex gap-1.5">
        <Button asChild variant="outline">
          <a href={template.website} target="_blank" rel="noopener noreferrer">
            Website
            <ExternalLink aria-hidden />
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={template.docs} target="_blank" rel="noopener noreferrer">
            Docs
            <ExternalLink aria-hidden />
          </a>
        </Button>
      </div>

      {/* What you are actually about to get. "A ready-made app" is one row in
          the list but four services on the canvas, and this is the only place
          before Create stack where that is stated. */}
      <div className="border-border-subtle mt-3.5 border-t pt-3">
        <div className="text-label text-fg-muted">Includes · {services.length}</div>
        <div className="mt-1.5 flex flex-col gap-0.5">
          {services.map((service) => (
            <div key={service} className="text-meta text-foreground font-mono">
              {service}
            </div>
          ))}
        </div>
      </div>

      {/**
       * **No warning banner here, and that is a measured decision.**
       *
       * The audit found `templateToFormData`'s warnings being dropped, and the
       * first fix put them in this rail. Then the obvious question got asked —
       * *why does a template warn at all?* — and the numbers answered it:
       *
       * | Template | Warnings |
       * |---|---|
       * | ToolJet | 7 (five of them the SAME sentence) |
       * | Immich | 5 · n8n 4 · Grafana 2 · OpenClaw 2 · Gitea 2 · Prometheus 1 |
       *
       * **Seven of seven.** A banner that appears on every item in a catalogue
       * is not a warning, it is chrome — and the content is not about your pick
       * either. "Environment variables imported as plain text" and "volume
       * created with default settings" are advice about what to do NEXT, on the
       * canvas, where the env vars and the volume actually are.
       *
       * They are also about **our own curated records**, not the user's input.
       * A template that converts badly is a bug in the registry, and the place
       * to catch that is a test — see `template-converts.test.ts` — not a
       * banner shown to every user of every app.
       *
       * The compose tab keeps its warnings, because there the file is YOURS and
       * what it says varies with what you pasted.
       */}
    </aside>
  )
}
