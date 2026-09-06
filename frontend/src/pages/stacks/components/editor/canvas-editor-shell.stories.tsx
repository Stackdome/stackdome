import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SYNC_STATUS } from '@/pages/stacks/lib/draft-sync/constants'
import { withHeight, withSheetHeader } from '../../../../../.storybook/decorators'
import { EDITOR_TABS } from './editor-tabs'
import { CanvasEditorShell, type CanvasEditorShellProps } from './canvas-editor-shell'

const canvasPlaceholder = (
  <div className="flex h-full items-center justify-center border border-dashed border-border text-body text-muted-foreground">
    canvas
  </div>
)

const defaultShellProps: CanvasEditorShellProps = {
  stackId: 's1',
  headerHealth: 'ok',
  subtitle: '3 services · 2 volumes',
  hasResources: true,
  activeTab: EDITOR_TABS.architecture,
  onTabChange: fn(),
  isActive: false,
  dirtyTotal: 0,
  isStaged: false,
  syncStatus: SYNC_STATUS.idle,
  deployBusy: false,
  canWrite: true,
  onDeploy: fn(),
  onDelete: fn(),
  canDeleteStack: true,
  publicEndpoints: [{ service: 'web', url: 'https://web.example.com', port: 443, variant: 'ready' }],
  architecture: canvasPlaceholder,
  deployments: <div />,
  logs: <div />,
  metrics: <div />,
}

const meta = {
  title: 'Features/EditorChrome/CanvasEditorShell',
  component: CanvasEditorShell,
  tags: ['ai-generated'],
  // The shell draws no header of its own — status, version, Deploy, the kebab
  // and the four tabs all portal into the sheet header (§12a). Mounted bare it
  // is a canvas with no chrome, so the story has to supply the real header.
  decorators: [withHeight(560), withSheetHeader],
  args: defaultShellProps,
} satisfies Meta<typeof CanvasEditorShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** New stack: editable name, no autosave/actions menu, draft deploy pill. */
export const DirtyDraft: Story = {
  args: {
    stackId: undefined,
    headerHealth: undefined,
    isNewStack: true,
    onDraftDeploy: fn(),
    isActive: true,
    dirtyTotal: 3,
    publicEndpoints: [],
  },
}

/** Name validation failing on a draft. */
export const Validating: Story = {
  args: {
    stackId: undefined,
    headerHealth: undefined,
    isNewStack: true,
    publicEndpoints: [],
  },
}

/** Viewer without write access: pending changes visible but deploy/delete gated. */
export const ReadOnly: Story = {
  args: {
    canWrite: false,
    canDeleteStack: false,
    isActive: true,
    dirtyTotal: 2,
    syncStatus: SYNC_STATUS.saved,
  },
}
