// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntegrationRow, IntegrationListHeader } from "../integration-row";
import {
  GIT_INTEGRATION_TYPE_GITHUB_APP,
  GIT_INTEGRATION_TYPE_CREDENTIALS,
  STATUS_INSTALLED,
  STATUS_ACTIVE,
  STATUS_PENDING_INSTALL,
  REPOSITORY_SELECTION_ALL,
} from "@/lib/git-integrations";
import type { GitIntegration } from "@/api/git-integrations";

afterEach(cleanup);

vi.mock("@/api/git-integrations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listInstallations: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));

import { listInstallations } from "@/api/git-integrations";

function integration(overrides: Partial<GitIntegration> = {}): GitIntegration {
  return {
    id: "int-1",
    host: "github.com",
    type: GIT_INTEGRATION_TYPE_GITHUB_APP,
    status: STATUS_INSTALLED,
    credentials_configured: true,
    ...overrides,
  };
}

function renderRow(props: Partial<Parameters<typeof IntegrationRow>[0]> = {}) {
  return render(
    <IntegrationRow
      integration={integration()}
      onOpen={vi.fn()}
      onVerify={vi.fn()}
      {...props}
    />,
  );
}

describe("IntegrationRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listInstallations).mockResolvedValue({ items: [] });
  });

  it("renders a quiet row for an installed, credentials-configured integration", async () => {
    renderRow();
    await waitFor(() => expect(listInstallations).toHaveBeenCalled());
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.queryByText(/finish install/i)).not.toBeInTheDocument();
  });

  /**
   * The kebab held `Verify`, `Update credentials`, `Manage on GitHub` and
   * `Remove` — four acts nobody could see without opening the menu. The row
   * opens the provider's drawer and all four live there, in the open.
   */
  it("has no row menu, and the whole row opens the drawer", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const row = integration();
    renderRow({ onOpen, integration: row });
    await waitFor(() => expect(listInstallations).toHaveBeenCalled());

    expect(screen.queryByRole("button", { name: /^actions for /i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /GitHub at github.com/ }));
    expect(onOpen).toHaveBeenCalledWith(row);
  });

  /** Removing an action means removing its track AND its header label. */
  it("draws four tracks in the row, the header and the skeleton", async () => {
    const { container } = render(
      <>
        <IntegrationListHeader />
        <IntegrationRow integration={integration()} onOpen={vi.fn()} onVerify={vi.fn()} />
      </>,
    );
    await waitFor(() => expect(listInstallations).toHaveBeenCalled());
    const header = container.querySelector('[data-slot="data-list-header"]')!;
    expect(header.children).toHaveLength(4);
    expect(
      container.querySelector('[data-slot="data-list-row"]')!.children,
    ).toHaveLength(4);
  });

  it("renders a loud row with a banner CTA anchored to install_url for pending_install", async () => {
    renderRow({
      integration: integration({
        status: STATUS_PENDING_INSTALL,
        install_url: "https://github.com/apps/x/installations/new",
      }),
    });
    await waitFor(() => expect(listInstallations).toHaveBeenCalled());
    expect(screen.getByText(/app is created but not installed/i)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /finish install/i });
    expect(cta).toHaveAttribute("href", "https://github.com/apps/x/installations/new");
    expect(cta).toHaveAttribute("target", "_blank");
  });

  it("renders the banner CTA as disabled when install_url is missing", async () => {
    renderRow({ integration: integration({ status: STATUS_PENDING_INSTALL, install_url: undefined }) });
    await waitFor(() => expect(listInstallations).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: /finish install/i })).not.toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /finish install/i });
    expect(cta).toBeDisabled();
  });

  /** The banner names the fix, and the fix is the drawer — not the verify
   *  check, which answers a different question. */
  it("routes the action_needed banner CTA to onOpen, not onVerify", async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn();
    const onOpen = vi.fn();
    const creds = integration({
      type: GIT_INTEGRATION_TYPE_CREDENTIALS,
      status: STATUS_ACTIVE,
      host: "gitlab.com",
      credentials_configured: false,
    });
    renderRow({ onVerify, onOpen, integration: creds });
    await user.click(screen.getByRole("button", { name: /update credentials/i }), {
      pointerEventsCheck: 0,
    });
    expect(onOpen).toHaveBeenCalledWith(creds);
    expect(onVerify).not.toHaveBeenCalled();
  });

  it("hides the action_needed banner CTA on GitHub App rows (no PUT rotation path)", () => {
    renderRow({ integration: integration({ credentials_configured: false }) });
    expect(screen.getByText(/no credentials are stored/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update credentials/i })).not.toBeInTheDocument();
  });

  it("renders the access summary derived from installations", async () => {
    vi.mocked(listInstallations).mockResolvedValue({
      items: [{ id: "i1", repository_selection: REPOSITORY_SELECTION_ALL }],
    });
    renderRow();
    await waitFor(() => expect(screen.getByText("1 installation")).toBeInTheDocument());
    expect(screen.getByText("all repositories")).toBeInTheDocument();
  });

  it("loads installations with refresh=true so missed-webhook state self-heals on every visit", async () => {
    renderRow();
    await waitFor(() => expect(listInstallations).toHaveBeenCalledTimes(1));
    expect(listInstallations).toHaveBeenCalledWith("org-1", "int-1", true);
  });

  it("never fetches installations for a credentials row (no installations exist to refresh)", async () => {
    renderRow({
      integration: integration({ type: GIT_INTEGRATION_TYPE_CREDENTIALS, status: STATUS_ACTIVE, host: "gitlab.com" }),
    });
    expect(screen.getByText("gitlab.com")).toBeInTheDocument();
    await waitFor(() => expect(listInstallations).not.toHaveBeenCalled());
  });
});
