// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GitIntegrationsPage from "../index";
import { ConfirmProvider } from "@/components/branded/confirm";
import { MemoryRouter } from "react-router-dom";
import { SheetHost } from "@/test-support/sheet-host";
import {
  GIT_INTEGRATION_TYPE_GITHUB_APP,
  GIT_INTEGRATION_TYPE_CREDENTIALS,
  STATUS_INSTALLED,
  STATUS_ACTIVE,
} from "@/lib/git-integrations";

afterEach(() => {
  cleanup();
  // Radix restores `pointer-events` on unmount, and `cleanup()` tears the tree
  // down first — so a drawer left open in one test locks the next one out.
  document.body.style.pointerEvents = "";
});

const toastMock = vi.fn();

vi.mock("@/api/git-integrations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listGitIntegrations: vi.fn(),
  deleteGitIntegration: vi.fn(),
  listInstallations: vi.fn().mockResolvedValue({ items: [] }),
  verifyGitIntegration: vi.fn(),
  updateGitIntegration: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));
vi.mock("@/hooks/use-github-connect", () => ({
  useGithubConnect: () => ({ state: "idle", error: null, connect: vi.fn() }),
}));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock, dismiss: vi.fn(), toasts: [] }),
}));

import { listGitIntegrations, deleteGitIntegration, verifyGitIntegration, updateGitIntegration } from "@/api/git-integrations";

describe("GitIntegrationsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders branded empty state with a Connect provider action when list is empty", async () => {
    vi.mocked(listGitIntegrations).mockResolvedValue({ items: [] });
    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/no git providers yet/i)).toBeInTheDocument());
    // Header + empty-state both expose a connect CTA.
    expect(screen.getAllByRole("button", { name: /connect provider/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("opens the wizard from the empty-state action", async () => {
    vi.mocked(listGitIntegrations).mockResolvedValue({ items: [] });
    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/no git providers yet/i)).toBeInTheDocument());
    const [, emptyStateButton] = screen.getAllByRole("button", { name: /connect provider/i });
    fireEvent.click(emptyStateButton);
    expect(screen.getByText(/GitLab/)).toBeInTheDocument(); // provider grid visible
  });

  it("lists integrations inside the panel with human copy", async () => {
    vi.mocked(listGitIntegrations).mockResolvedValue({
      items: [
        { id: "g1", host: "github.com", type: GIT_INTEGRATION_TYPE_GITHUB_APP, status: STATUS_INSTALLED, credentials_configured: true },
        { id: "g2", host: "gitlab.com", type: GIT_INTEGRATION_TYPE_CREDENTIALS, status: STATUS_ACTIVE, credentials_configured: true },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("gitlab.com")).toBeInTheDocument());
    expect(screen.getByText("github.com")).toBeInTheDocument();
    // The list renders as a data list, with its columns labelled.
    expect(screen.getByText("Access")).toBeInTheDocument();
    expect(screen.getAllByText("Connected").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("GitHub App").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the error state and retries the fetch on Try again", async () => {
    vi.mocked(listGitIntegrations)
      .mockRejectedValueOnce(new Error("request failed with status 500"))
      .mockResolvedValueOnce({
        items: [{ id: "g1", host: "github.com", type: GIT_INTEGRATION_TYPE_GITHUB_APP, status: STATUS_INSTALLED, credentials_configured: true }],
      });

    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/git providers could not be loaded/i)).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(screen.getByText("github.com")).toBeInTheDocument());
    expect(listGitIntegrations).toHaveBeenCalledTimes(2);
  });

  it("verifies a repository URL through the verify dialog", async () => {
    vi.mocked(listGitIntegrations).mockResolvedValue({
      items: [{ id: "g1", host: "github.com", type: GIT_INTEGRATION_TYPE_CREDENTIALS, status: STATUS_ACTIVE, credentials_configured: true }],
    });
    vi.mocked(verifyGitIntegration).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("github.com")).toBeInTheDocument());

    const user = userEvent.setup();
    // The row opens the drawer; `Verify` rides its header band.
    await user.click(screen.getByRole("link", { name: /GitHub at github.com/ }), { pointerEventsCheck: 0 });
    await user.click(
      await screen.findByRole("button", { name: /verify repository access/i }),
      { pointerEventsCheck: 0 },
    );

    await userEvent.type(screen.getByLabelText(/repository url/i), "https://github.com/acme/webapp");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() =>
      expect(verifyGitIntegration).toHaveBeenCalledWith("org-1", "g1", "https://github.com/acme/webapp"),
    );
    expect(toastMock).toHaveBeenCalledWith({ title: "Repository access verified", variant: "success" });
  });

  it("removes a provider from the drawer's danger zone behind an acknowledged confirm", async () => {
    vi.mocked(listGitIntegrations)
      .mockResolvedValueOnce({
        items: [{ id: "g1", host: "github.com", type: GIT_INTEGRATION_TYPE_GITHUB_APP, status: STATUS_INSTALLED, credentials_configured: true }],
      })
      .mockResolvedValueOnce({ items: [] });
    vi.mocked(deleteGitIntegration).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("github.com")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: /GitHub at github.com/ }), { pointerEventsCheck: 0 });

    // The trigger is in the danger zone, never on the header band.
    const trigger = await screen.findByRole("button", { name: /remove provider/i });
    expect(trigger.closest('[data-slot="drawer-header"]')).toBeNull();
    await user.click(trigger, { pointerEventsCheck: 0 });

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(/remove this provider\?/i);
    const commit = screen.getByRole("button", { name: "Remove" });
    expect(commit).toBeDisabled();
    await user.click(screen.getByRole("checkbox"), { pointerEventsCheck: 0 });
    await user.click(commit, { pointerEventsCheck: 0 });

    await waitFor(() => expect(deleteGitIntegration).toHaveBeenCalledWith("org-1", "g1"));
    expect(toastMock).toHaveBeenCalledWith({ title: "Provider removed", variant: "success" });
    // The object the drawer is about is gone, so the drawer goes with it.
    await waitFor(() => expect(screen.queryByRole("button", { name: /remove provider/i })).toBeNull());
  });

  /**
   * A GitHub App has no `PUT` — access is granted per installation on GitHub —
   * so its drawer is a reading, not a form: no token fields, no footer, and the
   * way to change it is GitHub's own page.
   */
  it("opens a GitHub App as a reading, with Manage on GitHub and no form", async () => {
    vi.mocked(listGitIntegrations).mockResolvedValue({
      items: [{
        id: "g1", host: "github.com", type: GIT_INTEGRATION_TYPE_GITHUB_APP,
        status: STATUS_INSTALLED, credentials_configured: true,
        install_url: "https://github.com/apps/x/installations/new",
      }],
    });
    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("github.com")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: /GitHub at github.com/ }), { pointerEventsCheck: 0 });

    const manage = await screen.findByRole("link", { name: /manage on github/i });
    expect(manage).toHaveAttribute("href", "https://github.com/apps/x/installations/new");
    expect(screen.queryByLabelText(/access token/i)).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull();
    // Verification is refused for app-type integrations, so it is not offered.
    expect(screen.queryByRole("button", { name: /verify repository access/i })).toBeNull();
  });

  it("opens the credentials form from the row and PUTs on submit", async () => {
    vi.mocked(listGitIntegrations).mockResolvedValue({
      items: [
        { id: "g2", host: "gitlab.com", type: GIT_INTEGRATION_TYPE_CREDENTIALS, status: STATUS_ACTIVE, credentials_configured: true },
      ],
    });
    vi.mocked(updateGitIntegration).mockResolvedValue({ id: "g2", host: "gitlab.com" });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("gitlab.com")).toBeInTheDocument());

    await user.click(screen.getByRole("link", { name: /GitLab at gitlab.com/ }));

    await user.type(await screen.findByLabelText(/access token/i), "glpat-new");
    await user.click(screen.getByRole("button", { name: /^update credentials$/i }));

    await waitFor(() => {
      expect(updateGitIntegration).toHaveBeenCalledWith("org-1", "g2", {
        host: "gitlab.com",
        auth: { token: "glpat-new" },
      });
    });
    // Success refreshes the list: initial load + post-update.
    expect(listGitIntegrations).toHaveBeenCalledTimes(2);
  });

  it("routes the action_needed banner CTA to the drawer, not the add wizard", async () => {
    vi.mocked(listGitIntegrations).mockResolvedValue({
      items: [
        { id: "g2", host: "gitlab.com", type: GIT_INTEGRATION_TYPE_CREDENTIALS, status: STATUS_ACTIVE, credentials_configured: false },
      ],
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/git-integrations"]}>
        <ConfirmProvider>
          <SheetHost>
            <GitIntegrationsPage />
          </SheetHost>
        </ConfirmProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("gitlab.com")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /update credentials/i }));

    // The drawer is open (token field visible); the wizard did not open — its
    // provider catalogue is absent.
    expect(await screen.findByLabelText(/access token/i)).toBeInTheDocument();
    expect(screen.queryByText(/App install or access token/i)).not.toBeInTheDocument();
  });
});
