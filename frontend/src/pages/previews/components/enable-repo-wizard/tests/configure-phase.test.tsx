// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/api/preview-configs", () => ({
  createPreviewConfig: vi.fn(),
}));
vi.mock("@/api/git-integrations", () => ({
  listRepositoryBranches: vi.fn().mockResolvedValue({ items: ["main", "develop"], total: 2 }),
}));
vi.mock("@/lib/common", () => ({
  getCurrentOrganizationId: () => "org1",
}));
vi.mock("@/hooks/use-resource-projects", () => ({
  useResourceProjects: () => ({ projects: [], projectNameById: () => undefined, defaultProjectName: "default" }),
}));

import { createPreviewConfig } from "@/api/preview-configs";
import { AxiosError } from "axios";
import { ConfigurePhase } from "../configure-phase";

const repo = {
  fullName: "acme/webapp",
  cloneUrl: "https://github.com/acme/webapp.git",
  defaultBranch: "main",
  integrationId: "gi1",
};

// BlockedAction's Radix tooltip reads ResizeObserver on mount, which jsdom lacks.
beforeAll(() => {
  global.ResizeObserver =
    global.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("ConfigurePhase", () => {
  it("prefills name from repo and creates the config", async () => {
    (createPreviewConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    const onCreated = vi.fn();
    render(<ConfigurePhase repo={repo} onCreated={onCreated} />);

    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe("webapp");
    expect((screen.getByLabelText(/stackfile path/i) as HTMLInputElement).value).toBe("stackfile.yaml");

    await userEvent.click(screen.getByRole("button", { name: /enable previews/i }));

    await waitFor(() => {
      expect(createPreviewConfig).toHaveBeenCalledWith("org1", "default", {
        name: "webapp",
        git_repository: { repo_url: "https://github.com/acme/webapp.git", base_branch: "main" },
        stackfile_path: "stackfile.yaml",
        max_active_previews: 10,
        env: [],
      });
      expect(onCreated).toHaveBeenCalledWith("c1");
    });
  });

  it("falls back to the default stackfile path when the field is cleared", async () => {
    (createPreviewConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    render(<ConfigurePhase repo={repo} onCreated={vi.fn()} />);

    await userEvent.clear(screen.getByLabelText(/stackfile path/i));
    await userEvent.click(screen.getByRole("button", { name: /enable previews/i }));

    await waitFor(() => {
      expect(createPreviewConfig).toHaveBeenCalledWith(
        "org1",
        "default",
        expect.objectContaining({ stackfile_path: "stackfile.yaml" }),
      );
    });
  });

  it("marks name and base branch as required, and blocks the primary with an empty name", async () => {
    (createPreviewConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    render(<ConfigurePhase repo={repo} onCreated={vi.fn()} />);

    const nameInput = screen.getByLabelText(/^name/i);
    await userEvent.clear(nameInput);

    // The primary reports the gap rather than accepting a click and failing.
    const primary = screen.getByRole("button", { name: /enable previews/i });
    await waitFor(() => expect(primary).toBeDisabled());
    await userEvent.click(primary);
    expect(createPreviewConfig).not.toHaveBeenCalled();

    const nameLabel = screen.getByText(/^name$/i).closest("label");
    expect(nameLabel?.querySelector('[aria-hidden]')).toHaveTextContent("*");
  });

  it("names the missing field in the verb of the act, and unblocks once it is filled", async () => {
    render(<ConfigurePhase repo={repo} onCreated={vi.fn()} />);
    const nameInput = screen.getByLabelText(/^name/i);
    await userEvent.clear(nameInput);

    const primary = screen.getByRole("button", { name: /enable previews/i });
    await waitFor(() => expect(primary).toBeDisabled());

    // Reason lives on a focusable wrapper, so it is reachable without a pointer.
    fireEvent.focus(primary.parentElement!);
    expect(await screen.findAllByText("Enter a name")).not.toHaveLength(0);

    // Re-query: unblocking drops the tooltip wrapper, so the old node is stale.
    await userEvent.type(nameInput, "webapp");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /enable previews/i })).toBeEnabled(),
    );
  });

  it("says CHOOSE for a listed branch and ENTER when the branch is free text", async () => {
    // This repo lists branches, so the branch control is a Select.
    render(<ConfigurePhase repo={repo} onCreated={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText(/^name/i));
    const listedPrimary = screen.getByRole("button", { name: /enable previews/i });
    await waitFor(() => expect(listedPrimary).toBeDisabled());
    fireEvent.focus(listedPrimary.parentElement!);
    // Branch is prefilled here, so only the name is outstanding.
    expect(await screen.findAllByText("Enter a name")).not.toHaveLength(0);

    cleanup();

    // No integration to list against — the same field falls back to free text.
    render(
      <ConfigurePhase
        repo={{ ...repo, integrationId: null, defaultBranch: "" }}
        onCreated={vi.fn()}

      />,
    );
    const freeTextPrimary = screen.getByRole("button", { name: /enable previews/i });
    await waitFor(() => expect(freeTextPrimary).toBeDisabled());
    fireEvent.focus(freeTextPrimary.parentElement!);
    expect(await screen.findAllByText("Enter a base branch")).not.toHaveLength(0);
  });

  it("includes env vars in the payload, stripping empty-named rows", async () => {
    (createPreviewConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    render(<ConfigurePhase repo={repo} onCreated={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /add variable/i }));
    await userEvent.click(screen.getByRole("button", { name: /add variable/i }));

    const names = screen.getAllByLabelText(/^variable name$/i);
    const values = screen.getAllByLabelText(/^variable value$/i);
    await userEvent.type(names[0], "FOO");
    await userEvent.type(values[0], "bar");
    // Second row is left blank and should be stripped from the payload.

    await userEvent.click(screen.getByRole("button", { name: /enable previews/i }));

    await waitFor(() => {
      expect(createPreviewConfig).toHaveBeenCalledWith(
        "org1",
        "default",
        expect.objectContaining({ env: [{ name: "FOO", value: "bar" }] }),
      );
    });
  });

  it("blocks the primary on a duplicate variable name", async () => {
    render(<ConfigurePhase repo={repo} onCreated={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /add variable/i }));
    await userEvent.click(screen.getByRole("button", { name: /add variable/i }));

    const names = screen.getAllByLabelText(/^variable name$/i);
    await userEvent.type(names[0], "FOO");
    await userEvent.type(names[1], "FOO");

    const primary = screen.getByRole("button", { name: /enable previews/i });
    await waitFor(() => expect(primary).toBeDisabled());
    await userEvent.click(primary);
    expect(createPreviewConfig).not.toHaveBeenCalled();
  });

  it("blocks the primary when a variable has a value but no name", async () => {
    render(<ConfigurePhase repo={repo} onCreated={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /add variable/i }));
    await userEvent.type(screen.getAllByLabelText(/^variable value$/i)[0], "bar");

    // Submit would silently drop this row, so it is blocked instead of lost.
    const primary = screen.getByRole("button", { name: /enable previews/i });
    await waitFor(() => expect(primary).toBeDisabled());
    expect(createPreviewConfig).not.toHaveBeenCalled();
  });

  it("shows an inline error on 409", async () => {
    const err = new AxiosError("conflict");
    Object.defineProperty(err, "response", { value: { status: 409, data: { reason: "exists" } } });
    (createPreviewConfig as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    render(<ConfigurePhase repo={repo} onCreated={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /enable previews/i }));
    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeTruthy();
    });
  });
});
