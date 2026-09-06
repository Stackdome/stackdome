// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PreviewsPage from "../index";

afterEach(cleanup);

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));
vi.mock("@/api/preview-configs", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listAllPreviewConfigs: vi.fn(),
}));
vi.mock("@/hooks/use-preview-envs", () => ({
  usePreviewEnvs: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ canWriteAnyProject: true }),
}));
vi.mock("@/hooks/use-resource-projects", () => ({
  useResourceProjects: () => ({ defaultProjectName: "default" }),
}));
vi.mock("@/pages/previews/components/enable-repo-wizard/enable-repo-wizard", () => ({
  EnableRepoWizard: ({ open }: { open: boolean }) =>
    open ? <div data-testid="enable-repo-wizard" /> : null,
}));

import { listAllPreviewConfigs } from "@/api/preview-configs";
import { usePreviewEnvs } from "@/hooks/use-preview-envs";

const webapp = {
  id: "cfg-1",
  name: "webapp",
  git_repository: { repo_url: "https://github.com/acme/webapp.git", base_branch: "main" },
  stackfile_path: "stackfile.yaml",
  max_active_previews: 3,
};

const docs = {
  id: "cfg-2",
  name: "docs",
  git_repository: { repo_url: "https://github.com/acme/docs.git", base_branch: "trunk" },
  stackfile_path: "stackfile.yaml",
  max_active_previews: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listAllPreviewConfigs).mockResolvedValue([webapp, docs]);
  vi.mocked(usePreviewEnvs).mockReturnValue({
    envs: [
      { id: "env-1", config_id: "cfg-1", pr_number: "12", branch: "feat/one", status: { phase: "Ready" } },
      { id: "env-2", config_id: "cfg-1", pr_number: "13", branch: "feat/two", status: { phase: "Deploying" } },
      { id: "env-3", config_id: "cfg-2", pr_number: "44", branch: "docs/three", status: { phase: "Ready" } },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  });
});

/** `/previews` unless a config id is given — the two addresses are the same
 *  screen, which is the thing most of these cases are about. */
function renderPage(configId?: string) {
  // `PageHeader` portals the page's one fact and its actions into the title
  // row's slot and its tools into the toolbar row's (§12a), so without both
  // slots the header renders nowhere — which is how a blocked primary or a
  // missing filter would silently pass a test.
  for (const id of ["topnav-actions", "sheet-toolbar"]) {
    if (document.getElementById(id)) continue;
    const slot = document.createElement("div");
    slot.id = id;
    document.body.appendChild(slot);
  }
  return render(
    <MemoryRouter initialEntries={[configId ? `/previews/${configId}` : "/previews"]}>
      <Routes>
        <Route path="/previews" element={<PreviewsPage />} />
        <Route path="/previews/:configId" element={<PreviewsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PreviewsPage", () => {
  it("lists every environment with its repository when nothing is selected", async () => {
    renderPage();
    expect(await screen.findByText("PR #12")).toBeInTheDocument();
    expect(screen.getByText("PR #44")).toBeInTheDocument();
    // The Repository column only exists in this shape — with one repository
    // selected it would be the same word on every row.
    expect(screen.getByText("Repository")).toBeInTheDocument();
    expect(screen.getAllByTitle("webapp")).toHaveLength(2);
  });

  it("puts the repositories in the rail, A–Z, each with its count", async () => {
    renderPage();
    const rail = await screen.findByRole("navigation", { name: /repositories/i });
    // `All previews` pinned first, then the repositories A–Z, then the add
    // pinned at the foot.
    const rows = within(rail)
      .getAllByRole("button")
      // The gear is an icon button — its name is an `aria-label`, so it comes
      // back as empty text and would otherwise shift every index.
      .map((b) => b.textContent ?? "")
      .filter((t) => t.trim() !== "");
    expect(rows[0]).toContain("All previews");
    expect(rows[1]).toContain("docs");
    expect(rows[2]).toContain("webapp");
    expect(rows[2]).toContain("2");
    expect(rows.at(-1)).toContain("Enable repository");
  });

  it("selecting a repository navigates to its address", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^webapp/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/previews/cfg-1");
  });

  it("resolves /previews/:configId to the same screen with that repository selected", async () => {
    renderPage("cfg-1");
    // The context line names the selection — the sheet title never does (§12a).
    expect(await screen.findByRole("heading", { name: "webapp" })).toBeInTheDocument();
    expect(screen.getByText("github.com/acme/webapp · main")).toBeInTheDocument();
    expect(screen.getByText("PR #12")).toBeInTheDocument();
    expect(screen.queryByText("PR #44")).toBeNull();
  });

  it("warns and blocks New preview at the cap", async () => {
    renderPage("cfg-1");
    // Two of three, so it is not at the cap yet and nothing is blocked. The
    // count is not on the band any more — the absence of the banner IS the
    // "under the cap" reading.
    expect(await screen.findByRole("heading", { name: "webapp" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();

    cleanup();
    vi.mocked(usePreviewEnvs).mockReturnValue({
      envs: [
        { id: "env-1", config_id: "cfg-1", pr_number: "12", branch: "a", status: { phase: "Ready" } },
        { id: "env-2", config_id: "cfg-1", pr_number: "13", branch: "b", status: { phase: "Ready" } },
        { id: "env-3", config_id: "cfg-1", pr_number: "14", branch: "c", status: { phase: "Ready" } },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderPage("cfg-1");
    expect(await screen.findByRole("alert")).toHaveTextContent(/at the limit of 3 environments/i);
    expect(screen.getByRole("button", { name: /new preview/i })).toBeDisabled();
  });

  it("keeps the tools up on a repository with nothing open, so the body does not jump", async () => {
    vi.mocked(usePreviewEnvs).mockReturnValue({
      envs: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderPage("cfg-1");
    expect(await screen.findByText(/no open pull requests/i)).toBeInTheDocument();
    // The rail is a selector: hiding the toolbar on an empty repository moves
    // the whole body 44px every time you click down it.
    expect(screen.getByLabelText("Filter previews")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /status:/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sort:/i })).toBeInTheDocument();
  });

  it("sorts by pull request number as a NUMBER, not as the string it arrives as", async () => {
    vi.mocked(usePreviewEnvs).mockReturnValue({
      envs: [
        { id: "e1", config_id: "cfg-1", pr_number: "99", branch: "a", status: { phase: "Ready" } },
        { id: "e2", config_id: "cfg-1", pr_number: "128", branch: "b", status: { phase: "Ready" } },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const user = userEvent.setup();
    renderPage("cfg-1");
    await user.click(await screen.findByRole("button", { name: /sort:/i }));
    await user.click(await screen.findByRole("menuitem", { name: /pull request number/i }));

    const names = screen.getAllByText(/^PR #/).map((el) => el.textContent);
    expect(names).toEqual(["PR #128", "PR #99"]);
  });

  it("shows the first-run state with no rail when no repository is enabled", async () => {
    vi.mocked(listAllPreviewConfigs).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(/preview every pull request/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /repositories/i })).toBeNull();
    await user.click(screen.getAllByRole("button", { name: /enable repository/i })[0]);
    expect(await screen.findByTestId("enable-repo-wizard")).toBeInTheDocument();
  });
});
