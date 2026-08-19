import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { RenameableTitle } from './renameable-title'

const meta = {
  title: 'Branded/RenameableTitle',
  component: RenameableTitle,
  tags: ['ai-generated'],
  args: { name: 'orders-api', onRename: fn(async () => {}) },
} satisfies Meta<typeof RenameableTitle>

export default meta
type Story = StoryObj<typeof meta>

/** At rest it is the title and nothing else — the pencil is a hover state. */
export const Default: Story = {}

/** Clicking opens the field with the name selected, so typing replaces it. */
export const Editing: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    await waitFor(() => expect(canvas.getByLabelText('Stack name')).toBeInTheDocument())
  },
}

/** Enter commits. */
export const EnterCommits: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    const field = await canvas.findByLabelText('Stack name')
    await userEvent.clear(field)
    await userEvent.type(field, 'checkout-api{Enter}')
    await waitFor(() => expect(args.onRename).toHaveBeenCalledWith('checkout-api'))
  },
}

/** **Escape abandons, and the old name is still there.** */
export const EscapeAbandons: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    const field = await canvas.findByLabelText('Stack name')
    await userEvent.clear(field)
    await userEvent.type(field, 'whatever{Escape}')
    await expect(args.onRename).not.toHaveBeenCalled()
    await waitFor(() => expect(canvas.getByRole('button', { name: /Rename orders-api/ })).toBeInTheDocument())
  },
}

/**
 * **Clicking away saves.** The inline-rename convention everywhere it appears;
 * a title that needed a confirm button would be the one control on the screen
 * you had to learn.
 */
export const BlurCommits: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    const field = await canvas.findByLabelText('Stack name')
    await userEvent.clear(field)
    await userEvent.type(field, 'checkout-api')
    field.blur()
    await waitFor(() => expect(args.onRename).toHaveBeenCalledWith('checkout-api'))
  },
}

/**
 * **Escape reverts, and does not save on its way out.** Leaving the field is
 * what commits and cancelling leaves the field, so the two would collide — the
 * regression this guards is Escape saving the very thing it discarded.
 */
export const EscapeBeatsTheBlurCommit: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    const field = await canvas.findByLabelText('Stack name')
    await userEvent.clear(field)
    await userEvent.type(field, 'discard-me{Escape}')
    field.blur()
    await expect(args.onRename).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: /Rename orders-api/ })).toBeInTheDocument(),
    )
  },
}

/** Enter commits once, not twice — the blur that follows finds the door shut. */
export const EnterCommitsExactlyOnce: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    const field = await canvas.findByLabelText('Stack name')
    await userEvent.clear(field)
    await userEvent.type(field, 'checkout-api{Enter}')
    field.blur()
    await waitFor(() => expect(args.onRename).toHaveBeenCalledTimes(1))
  },
}

/**
 * **A refused name keeps its text and its focus.** The server's own words land
 * under the field, so the fix is typing rather than starting again.
 */
export const ServerRefuses: Story = {
  args: {
    onRename: fn(async () => {
      throw new Error('A stack named "checkout-api" already exists')
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    const field = await canvas.findByLabelText('Stack name')
    await userEvent.clear(field)
    await userEvent.type(field, 'checkout-api{Enter}')
    await waitFor(() =>
      expect(canvas.getByRole('alert')).toHaveTextContent('already exists'),
    )
    await expect(canvas.getByLabelText('Stack name')).toHaveValue('checkout-api')
  },
}

/** An empty name is refused before it reaches the server — and refused out
 *  loud, rather than silently reverting as though nothing was typed. */
export const EmptyIsRefused: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    const field = await canvas.findByLabelText('Stack name')
    await userEvent.clear(field)
    await userEvent.type(field, '{Enter}')
    await expect(args.onRename).not.toHaveBeenCalled()
    await waitFor(() => expect(canvas.getByRole('alert')).toBeInTheDocument())
  },
}

/** Committing the name it already had is a no-op, not a write. */
export const UnchangedIsNotAWrite: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Rename orders-api/ }))
    const field = await canvas.findByLabelText('Stack name')
    await userEvent.type(field, '{Enter}')
    await expect(args.onRename).not.toHaveBeenCalled()
  },
}

/** A long name still fits the row rather than pushing the actions off it. */
export const LongName: Story = {
  args: { name: 'internal-platform-notifications-gateway' },
}
