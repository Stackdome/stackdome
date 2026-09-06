import type { Meta, StoryObj } from "@storybook/react-vite"
import { StatusChip } from "./status-chip"

const meta = {
  title: "Branded/StatusChip",
  component: StatusChip,
  tags: ["ai-generated"],
  args: { domain: "stack_rollup", state: "Degraded" },
} satisfies Meta<typeof StatusChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The seven readings a stack can have, in the order they get worse. Word,
 *  glyph and hue are all derived — none of them is a prop. */
export const StackRollup: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {["Healthy", "Deploying", "Degraded", "Unavailable", "Failed", "NotDeployed", "Deleting"].map(
        (state) => (
          <StatusChip key={state} domain="stack_rollup" state={state} />
        ),
      )}
    </div>
  ),
}

/** A managed database's vocabulary — `Hibernated` and `Fenced` are both "up but
 *  not serving" and neither is a fault, so both colour neutral. */
export const Addon: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {["Ready", "Creating", "Backing up", "Hibernated", "Fenced", "Error", "Deleting"].map(
        (state) => (
          <StatusChip key={state} domain="addon" state={state} />
        ),
      )}
    </div>
  ),
}

/** Inside the 32px control row it actually ships in — it must clear both edges
 *  and must not read as a control you can press. */
export const InAControlRow: Story = {
  render: () => (
    <div className="border-border flex h-8 items-center gap-3 border border-dashed px-2">
      <span className="text-name text-foreground font-medium">orders-api</span>
      <StatusChip domain="stack_rollup" state="Degraded" />
    </div>
  ),
}

/** A word the map has never seen colours `info` and draws no glyph — visibly
 *  unrecognised, never a silent green, never a stand-in mark. */
export const UnknownState: Story = {
  args: { domain: "stack_rollup", state: "Reticulating" },
}

/** No state at all is neutral, not an error. */
export const NoState: Story = {
  args: { domain: "stack_rollup", state: undefined },
}
