// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GitSourcePicker, repoTail } from "../git-source-picker";
import {
  GIT_INTEGRATION_TYPE_GITHUB_APP,
  GIT_INTEGRATION_TYPE_CREDENTIALS,
  STATUS_INSTALLED,
  STATUS_ACTIVE,
} from "@/lib/git-integrations";

afterEach(cleanup);

vi.mock("@/api/git-integrations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listGitIntegrations: vi.fn(),
  listRepositories: vi.fn(),
  getRepository: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));
// The nested connect drawer drags in the whole github-connect flow; the picker
// only needs its open/close contract.
vi.mock("@/components/git-source-picker/connect-provider-drawer", () => ({
  ConnectProviderDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-integration-wizard" /> : null,
}));

import { listGitIntegrations, listRepositories, getRepository } from "@/api/git-integrations";

const app = {
  id: "int-app",
  host: "github.com",
  type: GIT_INTEGRATION_TYPE_GITHUB_APP,
  status: STATUS_INSTALLED,
  credentials_configured: true,
};
const creds = {
  id: "int-creds",
  host: "gitlab.example.com",
  type: GIT_INTEGRATION_TYPE_CREDENTIALS,
  status: STATUS_ACTIVE,
  credentials_configured: true,
};

/**
 * The picker is **controlled** for its source and its typed URL — the caller
 * owns them so the step survives an unmount. This stands in for that caller, so
 * switching tabs and typing a URL behave here exactly as they do in the
 * new-stack drawer and the Enable-repository wizard.
 */
function Harness(props: Partial<Parameters<typeof GitSourcePicker>[0]>) {
  const [mode, setMode] = useState<"provider" | "url">("provider");
  const [url, setUrl] = useState("");
  return (
    <GitSourcePicker
      value={null}
      onChange={vi.fn()}
      mode={mode}
      onModeChange={setMode}
      url={url}
      onUrlChange={setUrl}
      {...props}
    />
  );
}

function renderPicker(props: Partial<Parameters<typeof GitSourcePicker>[0]> = {}) {
  return render(<Harness {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listGitIntegrations).mockResolvedValue({ items: [app, creds] });
  vi.mocked(listRepositories).mockResolvedValue({ items: [] });
});

describe("repoTail", () => {
  it("extracts owner/name from clone URLs", () => {
    expect(repoTail("https://github.com/acme/api.git")).toBe("acme/api");
    expect(repoTail("https://gitlab.example.com/group/app/")).toBe("group/app");
  });
});

describe("GitSourcePicker", () => {
  it("searches repos for the auto-selected GitHub App and emits the picked repo with fetched detail", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.mocked(listRepositories).mockResolvedValue({
      items: [{ full_name: "acme/webapp", clone_url: "https://github.com/acme/webapp.git", private: false }],
    });
    vi.mocked(getRepository).mockResolvedValue({
      full_name: "acme/webapp",
      clone_url: "https://github.com/acme/webapp.git",
      default_branch: "main",
    });
    renderPicker({ onChange });
    await user.click(await screen.findByText("acme/webapp"), { pointerEventsCheck: 0 });
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        fullName: "acme/webapp",
        cloneUrl: "https://github.com/acme/webapp.git",
        defaultBranch: "main",
        integrationId: "int-app",
      }),
    );
  });

  it("switches to host-scoped URL entry for a credentials integration and validates the host", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker({ onChange });
    await user.click(await screen.findByRole("button", { name: /credentials/i }), { pointerEventsCheck: 0 });
    await user.click(await screen.findByText("gitlab.example.com"), { pointerEventsCheck: 0 });

    const input = await screen.findByPlaceholderText(/gitlab\.example\.com/);
    await user.clear(input);
    await user.type(input, "https://gitlab.example.com/group/app");
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        fullName: "group/app",
        cloneUrl: "https://gitlab.example.com/group/app",
        defaultBranch: "",
        integrationId: "int-creds",
      }),
    );

    await user.clear(input);
    await user.type(input, "https://github.com/elsewhere/app");
    // "gitlab.example.com" also appears in the dropdown trigger and the helper
    // copy above the input, so match the exact error sentence rather than a
    // host-only regex to avoid an ambiguous "multiple elements" match.
    expect(
      await screen.findByText("URL must be on gitlab.example.com to use this connection."),
    ).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null));
  });

  it("emits a public repo (integrationId null) from the Public URL tab and shows the hint", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker({ onChange, publicUrlHint: "PR automation requires a connected provider." });
    await user.click(await screen.findByRole("radio", { name: /public url/i }), { pointerEventsCheck: 0 });
    expect(screen.getByText(/PR automation requires a connected provider/)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/https:\/\//), "https://github.com/acme/site");
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        fullName: "acme/site",
        cloneUrl: "https://github.com/acme/site",
        // Create-stack's default, and the same word the resolved row shows —
        // the row and the form it prefills cannot disagree.
        defaultBranch: "main",
        integrationId: null,
      }),
    );
  });

  it("only counts a URL as a repository once it has an owner AND a name", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker({ onChange });
    await user.click(await screen.findByRole("radio", { name: /public url/i }), { pointerEventsCheck: 0 });
    const input = screen.getByPlaceholderText(/https:\/\//);

    // A host on its own is not a repository, and neither is a user page. The
    // old gate passed any non-empty string, so `Continue` went live on "abc".
    await user.type(input, "https://github.com");
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/this will build/i)).not.toBeInTheDocument();

    await user.type(input, "/acme/awwdits.git");
    await waitFor(() => expect(screen.getByText(/this will build/i)).toBeInTheDocument());
    expect(screen.getByText("acme/awwdits")).toBeInTheDocument();
  });

  it("marks the live source on the control itself, and never in brand orange", async () => {
    const user = userEvent.setup();
    renderPicker();
    // The switch is a segmented control, so "which one is live" is an aria
    // state rather than an underline — and the tab strip's ink underline went
    // with it.
    const provider = await screen.findByRole("radio", { name: /^provider$/i });
    const url = screen.getByRole("radio", { name: /public url/i });
    expect(provider).toHaveAttribute("aria-checked", "true");
    expect(url).toHaveAttribute("aria-checked", "false");
    expect(provider.className).not.toContain("brand");

    await user.click(url, { pointerEventsCheck: 0 });
    // Re-queried, not reused. The two sources render the switch in different
    // places — inside the sticky band on Provider, alone on its own row on
    // Public URL — so switching remounts the control and the old nodes are
    // detached. Same structure as create-stack's repository step.
    expect(screen.getByRole("radio", { name: /public url/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^provider$/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /public url/i }).className).not.toContain("brand");
  });

  it("clears the Public URL field and re-emits null when switching away and back", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker({ onChange });
    await user.click(await screen.findByRole("radio", { name: /public url/i }), { pointerEventsCheck: 0 });
    const urlInput = screen.getByPlaceholderText(/https:\/\//);
    await user.type(urlInput, "https://github.com/acme/site");
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        fullName: "acme/site",
        cloneUrl: "https://github.com/acme/site",
        defaultBranch: "main",
        integrationId: null,
      }),
    );

    await user.click(await screen.findByRole("radio", { name: /^provider$/i }), { pointerEventsCheck: 0 });
    expect(onChange).toHaveBeenLastCalledWith(null);

    await user.click(await screen.findByRole("radio", { name: /public url/i }), { pointerEventsCheck: 0 });
    expect(screen.getByPlaceholderText(/https:\/\//)).toHaveValue("");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("shows the configure escape hatch from the selected integration's install URL when the search returns nothing", async () => {
    vi.mocked(listGitIntegrations).mockResolvedValue({
      items: [{ ...app, install_url: "https://github.com/apps/x/installations/new" }, creds],
    });
    renderPicker();
    const link = await screen.findByRole("link", { name: /configure in github/i });
    expect(link).toHaveAttribute("href", "https://github.com/apps/x/installations/new");
  });

  it("omits the configure escape hatch when the selected integration has no install URL", async () => {
    renderPicker();
    await screen.findByRole("radio", { name: /^provider$/i });
    expect(await screen.findByText(/no repository matches that/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /configure in github/i })).not.toBeInTheDocument();
  });

  it("offers the first-run empty state, and its action, when no integrations exist", async () => {
    const user = userEvent.setup();
    vi.mocked(listGitIntegrations).mockResolvedValue({ items: [] });
    renderPicker();
    // First-run gets the drawing and a title, not a dashed box with a sentence.
    expect(await screen.findByText(/no git provider connected yet/i)).toBeInTheDocument();
    // And it names the other source, because a public URL is a peer and this is
    // the moment someone needs telling they are not stuck.
    expect(screen.getByText(/add a repository by public url/i)).toBeInTheDocument();
    const btn = await screen.findByRole("button", { name: /connect provider/i });
    await user.click(btn, { pointerEventsCheck: 0 });
    expect(await screen.findByTestId("add-integration-wizard")).toBeInTheDocument();
  });
});
