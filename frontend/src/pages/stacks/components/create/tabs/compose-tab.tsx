import { useRef } from "react"
import { Upload } from "lucide-react"

import { AlertBanner } from "@/components/branded"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { parseAndValidateDockerCompose } from "@/pages/stacks/lib/docker-compose-parser"
import { convertDockerComposeToStackData } from "@/pages/stacks/lib/docker-compose-converter"
import type { DockerComposeFile } from "@/types/docker-compose"

import type { ComposePreview } from "../selection"

const EXAMPLE = `services:
  web:
    image: nginx:1.27
    ports:
      - "8080:80"
  api:
    image: ghcr.io/acme/api:latest
    depends_on:
      - db
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`

/**
 * Reads a compose file the moment there is one to read.
 *
 * **The preview is the point.** An import that only tells you what it did after
 * it has done it makes you undo work to find out; showing the services and
 * volumes it found, before you commit, is what turns this from a leap into a
 * choice.
 *
 * ### It asks BOTH questions, not just the first
 *
 * It used to run the parser alone, which answers *is this a compose file?* The
 * question that decides whether `Create stack` produces anything is the second
 * one — *and can we build a stack out of it?* — and only the converter answers
 * that. A file that parsed but failed conversion sailed past the gate and
 * seeded an **empty stack**, silently.
 *
 * The converter is also the only thing that reports warnings. They were being
 * thrown away here (`warnings: []`, hardcoded) after the wizard that used to
 * toast them was deleted. They belong in the preview, next to what they are
 * about, rather than in a toast that arrives after you have already committed.
 */
export function parseCompose(yaml: string): ComposePreview | null {
  if (!yaml.trim()) return null
  try {
    const parsed = parseAndValidateDockerCompose(yaml) as {
      services?: Record<string, unknown>
      volumes?: Record<string, unknown>
    }
    const converted = convertDockerComposeToStackData(parsed as unknown as DockerComposeFile)
    if (!converted.success || !converted.data) {
      // **The service-specific errors, not the consequence.** The converter
      // reports both — "web: must have either image or build" AND "no valid
      // services found", the second being what the first caused. Comma-joined
      // they read as machine output and bury the one line you can act on.
      const errors = converted.errors ?? []
      const specific = errors.filter((e) => e.service)
      const shown = (specific.length > 0 ? specific : errors).map((e) =>
        e.service ? `${e.service}: ${e.message}` : e.message,
      )
      return {
        services: [],
        volumes: [],
        warnings: [],
        error:
          shown.join(". ") ||
          "That file is valid compose, but nothing in it could be turned into a stack.",
      }
    }
    return {
      services: Object.keys(parsed.services ?? {}),
      volumes: Object.keys(parsed.volumes ?? {}),
      // **Deduped.** The converter emits per SERVICE, so "environment variables
      // imported as plain text" arrives once per service — five identical lines
      // for a five-service file. The sentence is about the file, not about any
      // one service, so it is worth saying once and worthless said five times.
      warnings: [...new Set((converted.warnings ?? []).map((w) => w.message))],
      error: null,
    }
  } catch (error) {
    return {
      services: [],
      volumes: [],
      warnings: [],
      error: error instanceof Error ? error.message : "That file could not be read as compose YAML.",
    }
  }
}

export function ComposeTab({
  yaml,
  onChange,
}: {
  yaml: string
  onChange: (yaml: string) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const preview = parseCompose(yaml)
  const hasContent = yaml.trim().length > 0

  async function readFile(file: File) {
    onChange(await file.text())
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Textarea
        value={yaml}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste your docker-compose.yml here…"
        aria-label="Compose file"
        spellCheck={false}
        // The field's own well, not `--code-bg`: that ground is the terminal,
        // and it is near-black in BOTH themes (§3). This is something you type
        // into, so it takes the input fill.
        className="h-[260px] resize-none font-mono text-meta leading-5"
        onDrop={(event) => {
          const file = event.dataTransfer.files[0]
          if (!file) return
          event.preventDefault()
          void readFile(file)
        }}
      />

      {/* Working controls, so `flat` and ghost — the one filled button on this
          screen is `Create stack` in the footer (§9/§11). */}
      <div className="flex items-center gap-1.5">
        <Button variant="outline" shape="flat" onClick={() => fileInput.current?.click()}>
          <Upload />
          Upload a file
        </Button>
        {/* Two groups, split across the row.
            LEFT is how content gets IN from outside — a file you own.
            RIGHT is how the field itself is set — fill it with an example, or
            empty it. They are the same job on the same object, so they travel
            as a pair, and the pair sits opposite the thing it is not. */}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" shape="flat" onClick={() => onChange(EXAMPLE)}>
            {/* Once there is content, pasting an example replaces it — and the
                label has to say so, or the click is a surprise. */}
            {hasContent ? "Replace with an example" : "Paste an example"}
          </Button>
          <Button
            variant="destructive-ghost"
            shape="flat"
            disabled={!hasContent}
            onClick={() => onChange("")}
          >
            Clear
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".yml,.yaml,text/yaml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void readFile(file)
            event.target.value = ""
          }}
        />
      </div>

      {preview?.error && <AlertBanner tone="blocking">{preview.error}</AlertBanner>}

      {/* **`info`, not `blocking`** — the file converted, and these say what we
          had to change on the way (§4's tone ladder: "we did something to your
          input and you should know"). They used to arrive as a toast AFTER the
          import, which is the wrong moment: by then you would have to undo work
          to act on them. Here they sit above the preview of what you are about
          to make, while it is still a choice. */}
      {preview && !preview.error && preview.warnings.length > 0 && (
        <AlertBanner tone="info">
          {preview.warnings.length === 1 ? (
            preview.warnings[0]
          ) : (
            <>
              <p>We changed {preview.warnings.length} things to fit this into a stack:</p>
              <ul className="mt-1 list-disc pl-4">
                {preview.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </AlertBanner>
      )}

      {preview && !preview.error && (
        <div className="border-border-subtle mt-1.5 border-t pt-3">
          <div className="text-label text-fg-muted">
            Found in your file ·{" "}
            <span className="text-foreground">
              {preview.services.length} {preview.services.length === 1 ? "service" : "services"}
              {preview.volumes.length > 0 &&
                ` · ${preview.volumes.length} ${preview.volumes.length === 1 ? "volume" : "volumes"}`}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...preview.services, ...preview.volumes].map((name) => (
              <span
                key={name}
                className="border-border bg-control text-foreground rounded-sm border px-1.5 py-0.5 font-mono text-[11px] leading-4"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
