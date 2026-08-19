// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ConnectProviderDrawer } from "@/components/git-source-picker/connect-provider-drawer";

afterEach(cleanup);

const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockCheckAgain = vi.fn().mockResolvedValue(undefined);
let mockConnectState = "idle";
let mockConnectError: string | null = null;

vi.mock("@/hooks/use-github-connect", () => ({
  useGithubConnect: () => ({
    state: mockConnectState,
    error: mockConnectError,
    connect: mockConnect,
    checkAgain: mockCheckAgain,
  }),
}));
vi.mock("@/api/git-integrations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createGitIntegration: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

import { createGitIntegration } from "@/api/git-integrations";

function renderDrawer(props: Partial<Parameters<typeof ConnectProviderDrawer>[0]> = {}) {
  return render(
    <ConnectProviderDrawer
      open
      onOpenChange={vi.fn()}
      hasGithubApp={false}
      onCreated={vi.fn()}
      {...props}
    />,
  );
}

const pick = (name: RegExp) => fireEvent.click(screen.getByRole("option", { name }));

describe("ConnectProviderDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockCheckAgain.mockResolvedValue(undefined);
    mockConnectState = "idle";
    mockConnectError = null;
  });

  it("offers every provider in the registry, under the registry's own names", () => {
    renderDrawer();
    for (const name of ["GitHub", "GitLab", "Bitbucket", "Gitea", "Git host"]) {
      expect(screen.getByRole("option", { name: new RegExp(name) })).toBeInTheDocument();
    }
    // The tile list said "Other" where the integration list said "Git host".
    expect(screen.queryByRole("option", { name: /^Other/ })).toBeNull();
  });

  it("sends the four non-GitHub providers straight to the form, host prefilled", () => {
    renderDrawer();
    pick(/GitLab/);
    expect(screen.getByLabelText(/host/i)).toHaveValue("gitlab.com");
  });

  it("grows a third step on GitHub alone, and the middle crumb goes back to it", () => {
    renderDrawer();
    pick(/^GitHub/);
    expect(screen.getByRole("option", { name: /install github app/i })).toBeInTheDocument();

    pick(/use an access token/i);
    expect(screen.getByLabelText(/host/i)).toHaveValue("github.com");

    fireEvent.click(screen.getByRole("button", { name: "GitHub" }));
    expect(screen.getByRole("option", { name: /install github app/i })).toBeInTheDocument();
  });

  it("blocks the App row with its reason when one is already connected", () => {
    renderDrawer({ hasGithubApp: true });
    pick(/^GitHub/);
    const row = screen.getByRole("option", { name: /install github app/i });
    expect(row).toBeDisabled();
    expect(row).toHaveTextContent(/already connected/i);
  });

  it("starts the install and puts the wait in place, without growing the path", () => {
    renderDrawer();
    pick(/^GitHub/);
    fireEvent.click(screen.getByRole("option", { name: /install github app/i }));

    expect(mockConnect).toHaveBeenCalledOnce();
    expect(screen.getByText(/installing the github app/i)).toBeInTheDocument();
    // The current step is still GitHub — the wait asks nothing, so it is a state.
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument();
    // No invented progress: the hook has two states, so a three-stage checklist
    // was reporting stages nothing observed.
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));
    expect(mockCheckAgain).toHaveBeenCalledOnce();
  });

  it("puts a connect failure first in the body, above the copy it contradicts", () => {
    mockConnectError = "Popup blocked. Allow popups for this site and try again.";
    renderDrawer();
    pick(/^GitHub/);
    fireEvent.click(screen.getByRole("option", { name: /install github app/i }));

    const banner = screen.getByText(/popup blocked/i);
    const body = banner.closest('[data-slot="drawer-body"]');
    expect(body).not.toBeNull();
    expect(body!.firstElementChild!.contains(banner)).toBe(true);
    expect(screen.queryByText(/finish the installation in the github popup/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /check again/i })).toBeNull();

    mockConnect.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockConnect).toHaveBeenCalledOnce();
  });

  it("closes and toasts when the GitHub connect lands while open", () => {
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ConnectProviderDrawer open onOpenChange={onOpenChange} hasGithubApp={false} onCreated={onCreated} />,
    );

    mockConnectState = "connected";
    rerender(
      <ConnectProviderDrawer open onOpenChange={onOpenChange} hasGithubApp={false} onCreated={onCreated} />,
    );

    expect(onCreated).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "GitHub App installed", variant: "success" }),
    );
  });

  it("still refreshes the parent when the connect lands after the drawer closed", () => {
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ConnectProviderDrawer open onOpenChange={onOpenChange} hasGithubApp={false} onCreated={onCreated} />,
    );

    rerender(
      <ConnectProviderDrawer open={false} onOpenChange={onOpenChange} hasGithubApp={false} onCreated={onCreated} />,
    );
    expect(onCreated).not.toHaveBeenCalled();

    mockConnectState = "connected";
    rerender(
      <ConnectProviderDrawer open={false} onOpenChange={onOpenChange} hasGithubApp={false} onCreated={onCreated} />,
    );

    expect(onCreated).toHaveBeenCalledOnce();
    // Nothing to report to someone who has already left.
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("posts a token integration, then closes and toasts", async () => {
    vi.mocked(createGitIntegration).mockResolvedValue({ host: "gitlab.com" });
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    renderDrawer({ onCreated, onOpenChange });

    pick(/GitLab/);
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "glpat-abc" } });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(createGitIntegration).toHaveBeenCalledWith("org-1", {
      host: "gitlab.com",
      type: "git_credentials",
      auth: { token: "glpat-abc" },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "GitLab connected", variant: "success" }),
    );
  });

  it("posts basic auth when a username is given", async () => {
    vi.mocked(createGitIntegration).mockResolvedValue({ host: "bitbucket.org" });
    const onCreated = vi.fn();
    renderDrawer({ onCreated });

    pick(/Bitbucket/);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "my-user" } });
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "app-password" } });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(createGitIntegration).toHaveBeenCalledWith("org-1", {
      host: "bitbucket.org",
      type: "git_credentials",
      auth: { basic: { username: "my-user", password: "app-password" } },
    });
  });

  it("keeps the form and shows the failure in the footer when the POST fails", async () => {
    vi.mocked(createGitIntegration).mockRejectedValue(new Error("409 conflict"));
    renderDrawer();

    pick(/GitLab/);
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "glpat-abc" } });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    const banner = await screen.findByText(/conflict/i);
    expect(banner.closest('[data-slot="drawer-footer"]')).not.toBeNull();
    expect(screen.getByLabelText(/host/i)).toHaveValue("gitlab.com");
  });

  // The reasons themselves live in a Radix tooltip, which only mounts on hover
  // or focus — they are asserted in the stories, where there is a real pointer.
  it("blocks the primary until every required field is answered", () => {
    renderDrawer();
    pick(/Gitea/);
    // Gitea has no host prefill, so both required fields are outstanding.
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/host/i), { target: { value: "git.acme.dev" } });
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "tok" } });
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeEnabled();
  });

  it("requires a username on Bitbucket and nowhere else", () => {
    renderDrawer();
    pick(/Bitbucket/);
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "app-password" } });
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeDisabled();
    expect(screen.getByText(/^username$/i).closest("label")?.querySelector("[aria-hidden]"))
      .toHaveTextContent("*");

    fireEvent.click(screen.getByRole("button", { name: "Connect provider" }));
    pick(/GitLab/);
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "glpat-abc" } });
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeEnabled();
    expect(screen.getByText(/^username$/i).closest("label")?.querySelector("[aria-hidden]"))
      .toBeNull();
  });

  it("clears a typed token when the provider changes, so a secret never leaks across", () => {
    renderDrawer();
    pick(/GitLab/);
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: "glpat-secret" } });

    fireEvent.click(screen.getByRole("button", { name: "Connect provider" }));
    pick(/Bitbucket/);
    expect(screen.getByLabelText(/access token/i)).toHaveValue("");
  });

  it("has no footer on the catalogue and no Cancel on any step", () => {
    renderDrawer();
    expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    pick(/Gitea/);
    expect(document.querySelector('[data-slot="drawer-footer"]')).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^back$/i })).toBeNull();
  });
});
