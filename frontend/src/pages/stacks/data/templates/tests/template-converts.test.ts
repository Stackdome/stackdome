import { describe, expect, it } from "vitest"

import { templates } from "../registry"
import { templateToFormData } from "../template-to-form"

/**
 * **A template that does not convert is OUR bug, not the user's problem.**
 *
 * The create-stack drawer briefly showed conversion warnings in the template
 * rail. Measured, all seven templates warn — ToolJet with the same sentence
 * five times — so the banner appeared on every app in the catalogue and said
 * nothing. Worse, it reported on **our own curated records** to a user who
 * cannot act on them.
 *
 * The registry is first-party data, so the invariant belongs here: every
 * shipped template must convert into something buildable. If a new record
 * breaks that, CI says so — instead of a banner telling a customer about it.
 *
 * Warnings are deliberately NOT asserted. They are advice about what to do next
 * on the canvas ("consider secrets", "configure the volume"), they fire for
 * essentially every record, and pinning their count here would turn a copy edit
 * in the converter into a failing test.
 */
describe("every shipped template converts", () => {
  it.each(templates.map((t) => [t.id, t] as const))("%s", (_id, template) => {
    const { data } = templateToFormData(template)

    // Something to build.
    expect(data.spec?.stack_resources?.length ?? 0).toBeGreaterThan(0)

    // And every resource has a source, or the canvas gets a node it cannot deploy.
    for (const resource of data.spec?.stack_resources ?? []) {
      expect(resource.source, `${template.id} · ${resource.name} has no source`).toBeTruthy()
    }
  })
})
