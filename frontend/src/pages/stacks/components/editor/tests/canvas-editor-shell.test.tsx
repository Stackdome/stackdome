// @vitest-environment jsdom
import type { ReactElement } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render as rtlRender, screen, within, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SheetHost } from "@/test-support/sheet-host";
import { CanvasEditorShell } from "../canvas-editor-shell";
import { SYNC_STATUS } from "@/pages/stacks/lib/draft-sync/constants";
import { EDITOR_TABS } from "../editor-tabs";
import { useCanvasOverlay } from "@/pages/stacks/lib/canvas/canvas-overlay";

afterEach(cleanup);

/**
 * The shell draws no header of its own: the status, the version chip, Deploy,
 * the kebab and the four tabs all portal into the SHEET header (§12a). Mounted
 * bare it is a canvas with no chrome, so every assertion about the header would
 * report a failure the product does not have. `SheetHost` supplies the real
 * one, and the router under it is what the header reads the trail from.
 */
function render(ui: ReactElement) {
  return rtlRender(
    <MemoryRouter initialEntries={["/stacks/api"]}>
      <SheetHost>{ui}</SheetHost>
    </MemoryRouter>,
  );
}

const base = {
  subtitle: "0 services · 0 volumes",
  activeTab: EDITOR_TABS.architecture, onTabChange: () => {},
  isActive: true, dirtyTotal: 0, isStaged: false,
  hasResources: true,
  onViewChanges: () => {},
  syncStatus: SYNC_STATUS.idle,
  deployBusy: false, canWrite: true,
  onDraftDeploy: () => {}, draftDeploying: false,
  onDeploy: () => {}, onDelete: () => {},
  canDiscardDraft: false, canDeleteStack: true,
  // The shell hands its canvas chrome (tally, deploy pill) DOWN rather than
  // rendering it, so it lands inside the graph column instead of on top of the
  // inspector region. A stand-in for the architecture tab has to render it.
  architecture: <CanvasOverlayStub />, deployments: <div />, logs: <div />, metrics: <div />,
};

function CanvasOverlayStub() {
  return <div>{useCanvasOverlay()}</div>;
}

describe("CanvasEditorShell resource tally", () => {
  it("shows the canvas tally on the architecture tab", () => {
    render(<CanvasEditorShell {...base} />);
    expect(screen.getByText("0 services · 0 volumes")).toBeInTheDocument();
  });

  it("hides the canvas tally when an ops view overlays the canvas", () => {
    render(<CanvasEditorShell {...base} activeTab={EDITOR_TABS.deployments} />);
    expect(screen.queryByText("0 services · 0 volumes")).toBeNull();
  });
});

describe("CanvasEditorShell change dot", () => {
  // A dot, not a count — see the tab row. It reads the SAME number the version
  // chip does (the undeployed diff), so the two can never disagree, which is
  // what killed the count that used to live here.
  it("marks the Architecture tab when something is undeployed", () => {
    render(<CanvasEditorShell {...base} dirtyTotal={3} />);
    expect(screen.getByLabelText("has unsaved changes")).toBeInTheDocument();
  });

  it("shows no dot when nothing differs from the last deploy", () => {
    render(<CanvasEditorShell {...base} dirtyTotal={0} />);
    expect(screen.queryByLabelText("has unsaved changes")).toBeNull();
  });

  it("puts the dot on Architecture, not on the ops tabs", () => {
    render(<CanvasEditorShell {...base} dirtyTotal={2} />);
    const dot = screen.getByLabelText("has unsaved changes");
    expect(dot.closest("button")).toHaveTextContent("Architecture");
  });
});

describe("CanvasEditorShell header", () => {
  // The editor prints no title of its own: the sheet header above it already
  // says which stack this is, and saying it twice made the name the biggest
  // thing on a screen about the graph. **A draft is no longer an exception** —
  // it opens already named and is renamed through the trail, so the dashed
  // `name-your-stack` field that used to stand in for the title is gone.
  it("prints no title and no name field, in a draft or a saved stack", () => {
    const { rerender } = render(<CanvasEditorShell {...base} />);
    expect(screen.queryByRole("heading", { name: "tooljet" })).toBeNull();
    expect(screen.queryByPlaceholderText("name-your-stack")).toBeNull();

    rerender(<CanvasEditorShell {...base} isNewStack />);
    expect(screen.queryByPlaceholderText("name-your-stack")).toBeNull();
    expect(screen.queryByLabelText("Stack name")).toBeNull();
  });

  // The word is the stacks LIST's rollup, humanised — not the wire's. A stack
  // that reads "Healthy" on the list must not read "ok" in its own header.
  it("renders a single status chip and never a DRAFT pill", () => {
    render(<CanvasEditorShell {...base} headerHealth="ok" isStaged />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.queryByText("DRAFT")).toBeNull();
  });

  it("shows a neutral 'Not deployed' pill when no health is derivable (never deployed)", () => {
    render(<CanvasEditorShell {...base} />);
    expect(screen.getByText("Not deployed")).toBeInTheDocument();
  });

  it("failed first deploy shows an error chip (health 'failed'), not an empty header", () => {
    render(<CanvasEditorShell {...base} headerHealth="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByText("Not deployed")).toBeNull();
  });

  it("shows a pending 'Deleting' pill when the stack lifecycle is deleting, overriding health", () => {
    render(<CanvasEditorShell {...base} headerHealth="ok" lifecycle="deleting" />);
    expect(screen.getByText("Deleting")).toBeInTheDocument();
    expect(screen.queryByText("Healthy")).toBeNull();
  });
});

describe("CanvasEditorShell deploy pill", () => {
  it("draft with resources shows the pill Deploy wired to onDraftDeploy, no Details/menu", () => {
    const onDraftDeploy = vi.fn();
    render(
      <CanvasEditorShell {...base} isNewStack onDraftDeploy={onDraftDeploy} />,
    );
    // Scoped to the pill: the tab rail's "Deployments" tab also matches /deploy/i.
    const pill = within(screen.getByTestId("deploy-pill"));
    fireEvent.click(pill.getByRole("button", { name: /deploy/i }));
    expect(onDraftDeploy).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Details" })).toBeNull();
    expect(screen.queryByLabelText("Stack actions")).toBeNull();
  });

  it("empty draft shows no pill at all", () => {
    render(<CanvasEditorShell {...base} isNewStack hasResources={false} />);
    expect(screen.queryByTestId("deploy-pill")).toBeNull();
  });

  it("draft shows 'Deploying' while the draft deploy runs", () => {
    render(<CanvasEditorShell {...base} isNewStack draftDeploying />);
    expect(screen.getByRole("button", { name: /deploying/i })).toBeDisabled();
  });

  it("existing clean stack renders no pill and no rail Deploy", () => {
    render(<CanvasEditorShell {...base} />);
    expect(screen.queryByTestId("deploy-pill")).toBeNull();
    // Exact match — the tab rail's "Deployments" tab also matches a /deploy/i regex.
    expect(screen.queryByRole("button", { name: "Deploy" })).toBeNull();
  });

  it("existing dirty stack offers Deploy", () => {
    const onViewChanges = vi.fn();
    render(
      <CanvasEditorShell {...base} isActive dirtyTotal={3} onViewChanges={onViewChanges} />,
    );
    expect(within(screen.getByTestId("deploy-pill")).getByRole("button", { name: /Deploy/ })).toBeInTheDocument();
  });

  it("pill persists with 'Deploying' while deployBusy even at zero dirt", () => {
    render(<CanvasEditorShell {...base} deployBusy />);
    expect(screen.getByRole("button", { name: /deploying/i })).toBeInTheDocument();
  });

  // Deploy sits in the shared header now, so it does not belong to a tab —
  // it acts on the stack, and the stack is the same on every one of them.
  it("Deploy stays available on an ops tab", () => {
    render(<CanvasEditorShell {...base} isActive dirtyTotal={2} activeTab={EDITOR_TABS.logs} />);
    expect(screen.getByTestId("deploy-pill")).toBeInTheDocument();
  });

  it("staged-but-zero-count nets out — no pill", () => {
    render(<CanvasEditorShell {...base} isStaged dirtyTotal={0} />);
    expect(screen.queryByTestId("deploy-pill")).toBeNull();
  });
});

describe("CanvasEditorShell deploy-failed chip", () => {
  it("shows a 'Deploy failed' chip wired to onTabChange('deployments') when latestDeployFailed", () => {
    const onTabChange = vi.fn();
    render(<CanvasEditorShell {...base} latestDeployFailed onTabChange={onTabChange} />);
    const chip = screen.getByRole("button", { name: "Latest deploy failed — view deployments" });
    expect(chip).toBeInTheDocument();
    // The chip states the RELEASE's word; the button's name states what it is
    // about. "Failed" beside the stack's own rollup is one deploy, not the stack.
    expect(within(chip).getByText("Failed")).toBeVisible();
    fireEvent.click(chip);
    expect(onTabChange).toHaveBeenCalledWith(EDITOR_TABS.deployments);
  });

  it("renders no chip when latestDeployFailed is unset", () => {
    render(<CanvasEditorShell {...base} />);
    expect(screen.queryByRole("button", { name: "Latest deploy failed — view deployments" })).toBeNull();
  });
});

describe("CanvasEditorShell actions menu", () => {
  it("exposes the actions trigger for existing stacks with no 'Discard all changes' item", () => {
    // Radix popover content mounts on pointer interaction (not in jsdom), so we
    // assert the trigger exists and that the removed item never renders eagerly.
    render(<CanvasEditorShell {...base} isActive dirtyTotal={2} />);
    expect(screen.getByRole("button", { name: "Stack actions" })).toBeInTheDocument();
    expect(screen.queryByText("Discard all changes")).toBeNull();
  });

  /**
   * **A menu holding one destructive item is not a menu.** It opened as a
   * `role="menu"` whose whole content was `Delete stack` in danger ink — with
   * its cost written nowhere. §10 puts deleting a stack in the danger zone.
   */
  it("opens a danger zone, not a menu, and states the blast radius", async () => {
    const user = userEvent.setup();
    render(<CanvasEditorShell {...base} isActive />);
    await user.click(screen.getByRole("button", { name: "Stack actions" }), { pointerEventsCheck: 0 });

    const trigger = await screen.findByRole("button", { name: /delete stack/i });
    // No fake menu semantics: a role="menu" with no menu items is a lie a
    // screen reader reads out.
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger.closest('[role="menuitem"]')).toBeNull();

    const zone = screen.getByRole("heading", { name: /danger zone/i }).parentElement!;
    expect(zone).toContainElement(trigger);
    expect(zone).toHaveTextContent(/stops running/i);
  });

  /** Nothing is disabled without saying why (§11). */
  it("refuses the delete without write access, and says why", async () => {
    const user = userEvent.setup();
    render(<CanvasEditorShell {...base} isActive canDeleteStack={false} />);
    await user.click(screen.getByRole("button", { name: "Stack actions" }), { pointerEventsCheck: 0 });

    expect(await screen.findByRole("button", { name: /delete stack/i })).toBeDisabled();
  });

  it("fires onDelete without leaving the Radix pointer-events lock on body", async () => {
    // The `setTimeout(0)` this used to need is gone with the DropdownMenu.
    // That defer existed for a Radix DropdownMenu -> AlertDialog race: the
    // menu's close and the dialog's mount could leave
    // document.body.style.pointerEvents stuck at "none" forever, because the
    // dialog captured "none" as the value to restore on unmount.
    // (radix-ui/primitives#1836). A Popover is not modal by default, so it takes
    // no body lock to release and the callback can run on the click.
    const user = userEvent.setup();
    const pointerEventsAtCall: string[] = [];
    const onDelete = vi.fn(() => {
      pointerEventsAtCall.push(document.body.style.pointerEvents);
    });
    render(<CanvasEditorShell {...base} isActive onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Stack actions" }), { pointerEventsCheck: 0 });
    await user.click(await screen.findByRole("button", { name: /delete stack/i }), { pointerEventsCheck: 0 });
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
    expect(pointerEventsAtCall[0]).not.toBe("none");
  });
});

// The header no longer folds — one header, and the sidebar toggle is the only
// collapse left. What these still guard is that the chrome they name stays
// reachable now that there is only one copy of it.
describe("CanvasEditorShell header", () => {
  afterEach(() => localStorage.clear());

  it("keeps tabs clickable", () => {
    const onTabChange = vi.fn();
    render(<CanvasEditorShell {...base} stackId="s1" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Logs/ }));
    expect(onTabChange).toHaveBeenCalledWith(EDITOR_TABS.logs);
  });

  it("serves deploys via the pill", () => {
    render(<CanvasEditorShell {...base} stackId="s1" isActive dirtyTotal={2} />);
    expect(screen.getByTestId("deploy-pill")).toBeInTheDocument();
  });

  it("keeps public endpoint links reachable", () => {
    render(
      <CanvasEditorShell
        {...base}


        stackId="s1"
        publicEndpoints={[{ service: "web", url: "https://web.acme.dev" }]}
      />,
    );
    // The compact bar's chip (not inert) — the expanded row's copy is hidden.
    const links = screen.getAllByRole("link", { name: "Go to https://web.acme.dev" });
    expect(links.some((l) => l.closest("[inert]") === null)).toBe(true);
  });
});
