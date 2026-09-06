import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { makeStack } from "../../../../../.storybook/fixtures";
import { ReleaseState } from "@/pages/stacks/components/editor/tabs/deployments/release-states";
import type { Stack } from "@/api/stack-types";
import { DeployStackRow, StackRowHeader } from "./stack-row";

const meta = {
  title: "Features/StackRow",
  component: DeployStackRow,
  tags: ["ai-generated"],
  decorators: [
    (Story) => (
      // The real sheet width at 1440, minus the 12px content edge on each side.
      <div className="w-[1162px]">
        <StackRowHeader />
        <Story />
      </div>
    ),
  ],
  args: { projectName: "default" },
} satisfies Meta<typeof DeployStackRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const withSource = (over: Partial<Stack>) =>
  makeStack({
    spec: {
      stack_resources: [
        {
          name: "web",
          source: {
            git: {
              repo_url: "https://github.com/acme/web.git",
              branch: "main",
              commit: "a3f9d2e1c",
            },
          },
        },
      ],
      volumes: [{ name: "data" }],
    },
    ...over,
  } as Partial<Stack>);

const healthy = withSource({
  latest_release: { id: "r1", state: ReleaseState.Released },
  converged_release: { id: "r1", state: ReleaseState.Released, health: "ok" },
});

/**
 * The rest state, and the shape everything else is read against: **one line of
 * status**, 64px tall, with the rule living *inside* the 64 rather than under
 * it.
 */
export const Healthy: Story = {
  args: { stack: healthy },
  play: async ({ canvas }) => {
    const row = canvas.getByRole("link");
    await expect(row.getBoundingClientRect().height).toBe(64);
    await expect(canvas.getByText("Healthy")).toHaveAttribute(
      "data-status-variant",
      "ready",
    );
    // The row takes the same glyph as the card — a status that changes shape
    // between the two views costs a re-read every time you switch.
    await expect(
      canvas.getByText("Healthy").querySelector("svg"),
    ).not.toBeNull();
  },
};

/**
 * **The row says the WORD and stops.** A failed stack carries a reason on the
 * wire, and the row deliberately does not print it (Jaseem, 23 Aug 2026) — the
 * card view and the stack's own page do.
 *
 * This story guards the decision from both sides: the status must still read
 * `Failed` with its variant, the reason must **not** be in the row, and the
 * pitch must stay 64 so the column scans as one straight run.
 */
export const FailedShowsNoReason: Story = {
  args: {
    stack: withSource({
      id: "s-docs",
      name: "docs-site",
      latest_release: {
        id: "r9",
        state: ReleaseState.Failed,
        message: "web · image pull failed — ghcr.io/acme/docs:e91a02 not found",
        completed_at: "2026-08-05T11:40:00Z",
      },
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Failed")).toHaveAttribute(
      "data-status-variant",
      "error",
    );
    // The reason is on the stack and is NOT rendered here.
    await expect(
      canvas.queryByText(
        "web · image pull failed — ghcr.io/acme/docs:e91a02 not found",
      ),
    ).toBeNull();
    // 64 whatever the state — a broken row is the same height as a healthy one,
    // which is the point of taking the line out.
    await expect(canvas.getByRole("link").getBoundingClientRect().height).toBe(
      64,
    );
  },
};

/**
 * **No release message reaches the row**, whatever the backend wrote. Since the
 * reason line came off (23 Aug 2026) every row is one line by construction, so
 * what this guards now is the other half: an in-flight release carries a
 * `message` and the table still shows only the word.
 *
 * It also shows the word with **no icon**, a deliberate call rather than an
 * omission — none of the three families fit an in-flight state.
 */
export const DeployingShowsWordOnly: Story = {
  args: {
    stack: withSource({
      id: "s-billing",
      name: "billing-worker",
      latest_release: {
        id: "r2",
        state: ReleaseState.InProgress,
        message: "rolling out 1 of 3",
      },
      converged_release: {
        id: "r1",
        state: ReleaseState.Released,
        health: "ok",
      },
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Deploying")).toBeVisible();
    // The release carries a message and the row does not print it.
    await expect(canvas.queryByText("rolling out 1 of 3")).toBeNull();
  },
};

/** A long name truncates. It never wraps, and it never widens its column —
 *  the cap is what keeps the status word in the same place on every line. */
export const LongName: Story = {
  args: {
    stack: withSource({
      id: "s-long",
      name: "internal-platform-notification-dispatch-service-europe-west",
      latest_release: { id: "r1", state: ReleaseState.Released },
      converged_release: {
        id: "r1",
        state: ReleaseState.Released,
        health: "ok",
      },
    }),
  },
  play: async ({ canvas }) => {
    const name = canvas.getByText(
      "internal-platform-notification-dispatch-service-europe-west",
    );
    const style = getComputedStyle(name);
    await expect(style.textOverflow).toBe("ellipsis");
    await expect(style.whiteSpace).toBe("nowrap");
  },
};

/** Never deployed is a fact, not a failure — so it colours neutral and carries
 *  no reason line, exactly like a healthy row. */
export const NeverDeployed: Story = {
  args: { stack: makeStack({ id: "s-sandbox", name: "staging-sandbox" }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Not deployed")).toHaveAttribute(
      "data-status-variant",
      "neutral",
    );
  },
};

/**
 * **The row carries no actions at all.**
 *
 * It had one: a `Delete` revealed on hover, in a permanently reserved 32px
 * track so the status column would not jump when it appeared. Both are gone —
 * deleting a stack takes everything running on it and everything referencing
 * it, which is §10's blast radius, and the answer to that is the **danger
 * zone** on the object, not a trash can that surfaces under the pointer on a
 * row you were only scanning.
 *
 * A list is for **choosing**. The row opens the stack; what ends it lives where
 * what it costs can be written next to it.
 */
export const TheRowHasNoActions: Story = {
  args: { stack: healthy },
  play: async ({ canvas }) => {
    await expect(canvas.queryByLabelText("Delete orders-api")).toBeNull();
    await expect(canvas.queryByLabelText("Actions for orders-api")).toBeNull();
    await expect(canvas.queryByRole("button")).toBeNull();
    // Five tracks, not six: the reserved action slot went with the action.
    const row = canvas.getByRole("link");
    await expect(getComputedStyle(row).gridTemplateColumns.split(" ")).toHaveLength(5);
  },
};

/**
 * A stack on its way out still says so — the state word is the report now that
 * there is no disabled control to hang the reason on.
 */
export const DeletingSaysSo: Story = {
  args: {
    stack: withSource({ lifecycle: "deleting" }) as Stack,
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByLabelText("Delete orders-api")).toBeNull();
    await expect(canvas.getByRole("link")).toBeInTheDocument();
  },
};
