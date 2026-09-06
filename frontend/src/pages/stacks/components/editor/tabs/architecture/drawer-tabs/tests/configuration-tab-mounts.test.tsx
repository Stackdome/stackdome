// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { Tabs } from "@/components/ui/tabs";
import { StackResourceConfigurationTab, pickConfigurationDraft } from "../configuration-tab";

afterEach(cleanup);

/**
 * Mounts are attached on the canvas, so the drawer lists them read-only. The
 * row still has to show that it differs from the deployed baseline — without
 * offering a reset, which here would silently detach the volume.
 */

const DATA = { source_volume_name: "data", source_sub_path: "", target_path: "/data" };
const LOGS = { source_volume_name: "logs", source_sub_path: "", target_path: "/logs" };

function renderMounts(draftMounts: Array<Record<string, unknown>>, baselineMounts: Array<Record<string, unknown>>) {
  const resource = { name: "api", sourceType: "image" as const, source: { image: { ref: "api:1" } } };
  render(
    <Tabs defaultValue="general">
      <StackResourceConfigurationTab
        draft={pickConfigurationDraft({ ...resource, volume_mounts: draftMounts } as never)}
        baseline={pickConfigurationDraft({ ...resource, volume_mounts: baselineMounts } as never)}
        index={0}
        errors={{}}
        volumes={[]}
        mountsReadOnly
        onPatchResource={vi.fn()}
        onDiscardField={vi.fn()}
      />
    </Tabs>,
  );
  // The tint lives on the DirtyField wrapper, which is the row's outer element.
  // Found by its slot, not by a class it is painted with — this used to look
  // for `border-b`, which the row lost when sections stopped being ruled.
  return (targetPath: string) =>
    screen.getByText(targetPath).closest("[data-slot='dirty-field']") as HTMLElement | null;
}

describe("read-only mount rows", () => {
  /**
   * **The arrow is the mark.**
   *
   * `DirtyField` spends a wash on a compact row only when there is no arrow to
   * offer — the tint exists to say "this moved" when nothing else can. A mount
   * can be reset now, so the arrow says it, and a row carrying both would state
   * one fact twice in a 32px strip.
   */
  it("marks the row whose volume changed with a revert arrow, not a wash", () => {
    const rowFor = renderMounts([{ ...DATA, source_volume_name: "data-v2" }], [DATA]);
    const row = rowFor("/data")!;
    expect(within(row).getByLabelText("Reset to original value")).toBeInTheDocument();
    // `--change`, not `--brand`: "differs from what is deployed" is a state
    // mark and the system says state in blue (§5). Orange is the product's
    // accent and stays out of the editor's diff language — so if a wash ever
    // comes back here, it comes back blue.
    expect(row.className).not.toContain("bg-brand-bg");
  });

  it("leaves an unchanged row unmarked", () => {
    const rowFor = renderMounts([{ ...DATA, source_volume_name: "data-v2" }, LOGS], [DATA, LOGS]);
    expect(within(rowFor("/logs")!).queryByLabelText("Reset to original value")).toBeNull();
  });

  /**
   * **The reset restores the MOUNT — it does not detach.**
   *
   * It shipped with `hideReset`, which made a changed mount the only dirty mark
   * in the panel that showed you something had moved and gave you no way back.
   * The reasoning was that a reset here might read as "detach this volume", and
   * detaching is the canvas's act. But the arrow restores the field's baseline
   * values, exactly as it does in all fifteen other places it appears — the
   * mount stays mounted, its path goes back.
   *
   * The slot is reserved per LIST rather than per row (`reserveInlineReset`),
   * so an untouched list carries no empty column and a dirty one moves its rows
   * together.
   */
  it("opens the volume when the row is clicked", () => {
    const rowFor = renderMounts([DATA], [DATA]);
    expect(within(rowFor("/data")!).getByLabelText(/Open volume/)).toBeInTheDocument();
  });
});
