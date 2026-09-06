// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, beforeAll, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SheetHost } from "@/test-support/sheet-host";

// Radix popper content reads ResizeObserver on mount, which jsdom doesn't implement.
beforeAll(() => {
  global.ResizeObserver =
    global.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

import ClustersPage from "../index";
import type { Cluster } from "../types";
import { ConfirmProvider } from "@/components/branded/confirm";

const useClustersMock = vi.fn();

// Only the list hook is stubbed; `useDeleteCluster` is the real one, so the
// test exercises the seam the page actually calls through.
vi.mock(import("../hooks/use-clusters"), async (importOriginal) => ({
  ...(await importOriginal()),
  useClusters: () => useClustersMock(),
}));
const deleteClusterMock = vi.fn();
vi.mock("@/api/clusters", () => ({
  deleteCluster: (...args: unknown[]) => deleteClusterMock(...args),
  createCluster: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));

const toastMock = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock, dismiss: vi.fn(), toasts: [] }),
}));

const cluster = {
  id: "c1",
  name: "kind-local",
  cluster_url: "https://127.0.0.1:6443",
} as Cluster;

function renderPage() {
  return render(
    <ConfirmProvider>
      <MemoryRouter initialEntries={["/clusters"]}>
        <SheetHost>
          <Routes>
            <Route path="/clusters" element={<ClustersPage />} />
          </Routes>
        </SheetHost>
      </MemoryRouter>
    </ConfirmProvider>,
  );
}

afterEach(() => {
  cleanup();
  // Radix restores `pointer-events` on unmount, and `cleanup()` tears the tree
  // down first — so a drawer left open in one test locks the next one out.
  document.body.style.pointerEvents = "";
});

describe("ClustersPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stays on the list page and disables Add Cluster when one cluster exists", () => {
    useClustersMock.mockReturnValue({ clusters: [cluster], loading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText("kind-local")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add cluster/ })).toBeDisabled();
  });

  it("keeps Add Cluster enabled when no clusters exist", () => {
    useClustersMock.mockReturnValue({ clusters: [], loading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText("No clusters yet")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: /Add cluster/ })) {
      expect(button).toBeEnabled();
    }
  });

  it("opens the cluster details drawer when the row is clicked", async () => {
    useClustersMock.mockReturnValue({ clusters: [cluster], loading: false, error: null, refetch: vi.fn() });
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: /kind-local/ }));

    expect(await screen.findByText("API server")).toBeInTheDocument();
    expect(screen.getByText("https://127.0.0.1:6443")).toBeInTheDocument();
  });

  it("deletes from the drawer's danger zone behind a retype gate, then closes it", async () => {
    const refetch = vi.fn();
    useClustersMock.mockReturnValue({ clusters: [cluster], loading: false, error: null, refetch });
    deleteClusterMock.mockResolvedValue(undefined);
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: /kind-local/ }));

    // The trigger is in the danger zone, never on the header band.
    const del = await screen.findByRole("button", { name: /delete cluster/i });
    expect(del.closest('[data-slot="drawer-header"]')).toBeNull();
    await user.click(del);

    // §10 level 3 — a cluster has dependents, so the gate is the name retyped.
    const commit = await screen.findByRole("button", { name: /^delete$/i });
    expect(commit).toBeDisabled();
    await user.type(screen.getByLabelText(/type .* to confirm/i), "kind-local");
    await user.click(commit);

    await vi.waitFor(() => expect(deleteClusterMock).toHaveBeenCalledWith("org-1", "c1"));
    // The object the drawer is about is gone, so the drawer goes with it.
    await vi.waitFor(() => expect(screen.queryByText("API server")).toBeNull());
    expect(refetch).toHaveBeenCalled();
  });
});
