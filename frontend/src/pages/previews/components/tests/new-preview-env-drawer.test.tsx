// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Radix tooltip content reads ResizeObserver on mount, which jsdom doesn't
// implement — the blocked-action reasons are rendered in one.
beforeAll(() => {
  global.ResizeObserver =
    global.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

vi.mock("@/api/preview-envs", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/api/preview-envs")>();
  return { ...orig, createPreviewEnv: vi.fn() };
});
vi.mock("@/lib/common", () => ({
  getCurrentOrganizationId: () => "org1",
}));
vi.mock("@/hooks/use-resource-projects", () => ({
  useResourceProjects: () => ({ projects: [], projectNameById: () => undefined, defaultProjectName: "default" }),
}));

import { createPreviewEnv } from "@/api/preview-envs";
import { AxiosError } from "axios";
import { NewPreviewEnvDrawer } from "../new-preview-env-drawer";
import type { StackPreviewConfig } from "@/api/preview-configs";

const configs: StackPreviewConfig[] = [
  { id: "c1", name: "webapp", max_active_previews: 5 },
  { id: "c2", name: "docs-site", max_active_previews: 2 },
];

/** The drawer names its own repository now, so every case opens on one. */
const drawerProps = {
  configs,
  initialConfigId: "c1",
  activeCountFor: () => 1,
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("NewPreviewEnvDrawer", () => {
  it("creates an environment from PR number and branch", async () => {
    (createPreviewEnv as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
    const onCreated = vi.fn();
    render(<NewPreviewEnvDrawer open onOpenChange={() => {}} {...drawerProps} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/pr number/i), "42");
    await userEvent.type(screen.getByLabelText(/branch/i), "feat/login");
    await userEvent.click(screen.getByRole("button", { name: /create preview/i }));

    await waitFor(() => {
      expect(createPreviewEnv).toHaveBeenCalledWith("org1", "default", {
        config_id: "c1",
        pr_number: "42",
        branch: "feat/login",
      });
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it("sends pasted stackfile content when provided", async () => {
    (createPreviewEnv as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
    render(<NewPreviewEnvDrawer open onOpenChange={() => {}} {...drawerProps} onCreated={() => {}} />);

    await userEvent.type(screen.getByLabelText(/pr number/i), "7");
    await userEvent.type(screen.getByLabelText(/branch/i), "fix/nav");
    await userEvent.click(screen.getByRole("button", { name: /advanced/i }));
    await userEvent.type(screen.getByLabelText(/stackfile content/i), "name: test");
    await userEvent.click(screen.getByRole("button", { name: /create preview/i }));

    await waitFor(() => {
      expect(createPreviewEnv).toHaveBeenCalledWith("org1", "default", {
        config_id: "c1",
        pr_number: "7",
        branch: "fix/nav",
        stackfile_content: "name: test",
      });
    });
  });

  it("clears stale form state after closing without submitting and reopening", async () => {
    const { rerender } = render(
      <NewPreviewEnvDrawer open onOpenChange={() => {}} {...drawerProps} onCreated={() => {}} />,
    );

    await userEvent.type(screen.getByLabelText(/pr number/i), "42");
    await userEvent.type(screen.getByLabelText(/branch/i), "feat/login");

    // Close without submitting (e.g. Cancel/Escape/outside-click).
    rerender(
      <NewPreviewEnvDrawer open={false} onOpenChange={() => {}} {...drawerProps} onCreated={() => {}} />,
    );

    // Reopen.
    rerender(
      <NewPreviewEnvDrawer open onOpenChange={() => {}} {...drawerProps} onCreated={() => {}} />,
    );

    expect(screen.getByLabelText(/pr number/i)).toHaveValue(null);
    expect(screen.getByLabelText(/branch/i)).toHaveValue("");
  });

  it("marks PR number and branch as required, and blocks Create until both are filled", async () => {
    render(<NewPreviewEnvDrawer open onOpenChange={() => {}} {...drawerProps} onCreated={() => {}} />);

    // The drawer disables the primary and says why, rather than accepting the
    // click and reporting two errors after the fact.
    const create = screen.getByRole("button", { name: /create preview/i });
    expect(create).toBeDisabled();
    await userEvent.click(create);
    expect(createPreviewEnv).not.toHaveBeenCalled();

    const prLabel = screen.getByText(/^pr number$/i).closest("label");
    expect(prLabel?.querySelector("[aria-hidden]")).toHaveTextContent("*");
  });

  it("names both missing fields, then only the one still missing", async () => {
    render(<NewPreviewEnvDrawer open onOpenChange={() => {}} {...drawerProps} onCreated={() => {}} />);
    const create = screen.getByRole("button", { name: /create preview/i });

    // Both at once — reporting them one at a time turns a two-field form into
    // two rounds of hover, fill, hover again.
    fireEvent.focus(create.parentElement!);
    expect(await screen.findAllByText(/enter the pull request number/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/enter the branch to deploy/i)).not.toHaveLength(0);

    // Typing moves focus off the trigger, so the tooltip closes with it — the
    // reason has to be asked for again to see what is left.
    await userEvent.type(screen.getByLabelText(/pr number/i), "42");
    fireEvent.focus(create.parentElement!);
    await waitFor(() => {
      expect(screen.getAllByText(/enter the branch to deploy/i)).not.toHaveLength(0);
    });
    expect(screen.queryByText(/enter the pull request number/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/branch/i), "feat/login");
    expect(screen.getByRole("button", { name: /create preview/i })).toBeEnabled();
  });

  it("rejects an invalid image override line and expands Advanced to show it", async () => {
    render(<NewPreviewEnvDrawer open onOpenChange={() => {}} {...drawerProps} onCreated={() => {}} />);

    await userEvent.type(screen.getByLabelText(/pr number/i), "42");
    await userEvent.type(screen.getByLabelText(/branch/i), "feat/login");
    await userEvent.click(screen.getByRole("button", { name: /advanced/i }));
    await userEvent.type(screen.getByLabelText(/image overrides/i), "not-a-pair");
    await userEvent.click(screen.getByRole("button", { name: /create preview/i }));

    expect(await screen.findByText(/resource=image/i)).toBeInTheDocument();
    expect(createPreviewEnv).not.toHaveBeenCalled();
  });

  it("shows inline conflict message on 409", async () => {
    const err = new AxiosError("conflict");
    Object.defineProperty(err, "response", { value: { status: 409, data: { reason: "exists" } } });
    (createPreviewEnv as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    render(<NewPreviewEnvDrawer open onOpenChange={() => {}} {...drawerProps} onCreated={() => {}} />);

    await userEvent.type(screen.getByLabelText(/pr number/i), "42");
    await userEvent.type(screen.getByLabelText(/branch/i), "feat/login");
    await userEvent.click(screen.getByRole("button", { name: /create preview/i }));

    await waitFor(() => {
      expect(screen.getByText(/pr #42 already has a preview/i)).toBeTruthy();
    });
  });
});
