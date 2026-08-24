// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = vi.fn();

vi.mock("@/api/registry-credentials", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateRegistryCredential: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ getCurrentOrganizationId: () => "org-1" }));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock, dismiss: vi.fn(), toasts: [] }),
}));

import { updateRegistryCredential } from "@/api/registry-credentials";
import { RegistryDrawer } from "../registry-drawer";
import { PURPOSE_PULL } from "../../lib/providers";
import type { RegistryCredential } from "@/api/registry-credentials";

const credential: RegistryCredential = {
  id: "r1",
  host: "quay.io",
  username: "old-bot",
  purpose: PURPOSE_PULL,
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("RegistryDrawer", () => {
  it("prefills username, leaves password empty, shows host read-only", () => {
    render(<RegistryDrawer credential={credential} onOpenChange={vi.fn()} onUpdated={vi.fn()} onVerify={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByLabelText(/username/i)).toHaveValue("old-bot");
    expect(screen.getByLabelText(/password/i)).toHaveValue("");
    expect(screen.getByText("quay.io")).toBeInTheDocument();
    expect(screen.queryByLabelText(/host/i)).not.toBeInTheDocument();
  });

  it("submits rotation with host and purpose unchanged", async () => {
    vi.mocked(updateRegistryCredential).mockResolvedValue(credential);
    const onOpenChange = vi.fn();
    const onUpdated = vi.fn();
    const user = userEvent.setup();
    render(<RegistryDrawer credential={credential} onOpenChange={onOpenChange} onUpdated={onUpdated}
      onVerify={vi.fn()}
      onRemove={vi.fn()} />);

    await user.clear(screen.getByLabelText(/username/i));
    await user.type(screen.getByLabelText(/username/i), "new-bot");
    await user.type(screen.getByLabelText(/password/i), "n3w-secret");
    await user.click(screen.getByRole("button", { name: /update credentials/i }));

    await waitFor(() => {
      expect(updateRegistryCredential).toHaveBeenCalledWith("org-1", "r1", {
        host: "quay.io",
        username: "new-bot",
        password: "n3w-secret",
        purpose: PURPOSE_PULL,
      });
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Credentials updated" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  /**
   * **Blocked before the click, and it says which field** (§9).
   *
   * The dialog this replaced let you press `Update credentials` with an empty
   * password and answered with a field error underneath it. The drawer's
   * primary refuses instead — the reason is on the control, in the verb of the
   * act, before you spend the click.
   */
  it("refuses without a password and says which field is missing", async () => {
    const user = userEvent.setup();
    render(<RegistryDrawer credential={credential} onOpenChange={vi.fn()} onUpdated={vi.fn()} onVerify={vi.fn()} onRemove={vi.fn()} />);

    const submit = screen.getByRole("button", { name: /update credentials/i });
    expect(submit).toBeDisabled();

    // The reason anchors to a focusable wrapper — a disabled control swallows
    // pointer events, so it is reachable by keyboard and not by hover alone.
    submit.parentElement!.focus();
    expect(await screen.findAllByText(/enter the password/i)).not.toHaveLength(0);
    expect(updateRegistryCredential).not.toHaveBeenCalled();
  });

  it("keeps the drawer open and shows the failure in it", async () => {
    vi.mocked(updateRegistryCredential).mockRejectedValue(new Error("boom"));
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<RegistryDrawer credential={credential} onOpenChange={onOpenChange} onUpdated={vi.fn()} onVerify={vi.fn()} onRemove={vi.fn()} />);

    await user.type(screen.getByLabelText(/password/i), "n3w-secret");
    await user.click(screen.getByRole("button", { name: /update credentials/i }));

    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("resets fields when a different credential is opened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RegistryDrawer credential={credential} onOpenChange={vi.fn()} onUpdated={vi.fn()} onVerify={vi.fn()} onRemove={vi.fn()} />,
    );
    await user.type(screen.getByLabelText(/password/i), "typed");

    const other: RegistryCredential = { id: "r2", host: "ghcr.io", username: "gh-bot" };
    rerender(<RegistryDrawer credential={other} onOpenChange={vi.fn()} onUpdated={vi.fn()} onVerify={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByLabelText(/username/i)).toHaveValue("gh-bot");
    expect(screen.getByLabelText(/password/i)).toHaveValue("");
  });
});
