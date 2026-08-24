import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LazyLog } from 'react-lazylog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Check, Clock, ChevronsUpDown, Layers, ScrollText, WifiOff, RefreshCw } from 'lucide-react';
import { StatusPill, EmptyState, type StatusVariant } from '@/components/branded';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectTriggerVariants,
} from '@/components/ui/select';
import type { LogViewerProps, ConnectionStatus, TimeRangeOption, LogFilters } from './types';
import { useLogStream } from './use-log-stream';
import { convertLogsToLazyLogFormat, getTimeRangeLabel } from './utils';
import { cn } from '@/lib/utils';
import { readyResourceNames } from '@/pages/stacks/lib/resource-readiness';

function connectionStatusInfo(status: ConnectionStatus): { variant: StatusVariant; label: string } {
  switch (status) {
    case 'connecting':
      return { variant: 'pending', label: 'Connecting' };
    case 'connected':
      // `Live` — the same word Metrics uses for the same state. Two sibling
      // tabs streaming the same stack said `Connected` and `Live`.
      return { variant: 'ready', label: 'Live' };
    case 'reconnecting':
      return { variant: 'pending', label: 'Reconnecting' };
    case 'disconnected':
      return { variant: 'neutral', label: 'Disconnected' };
    default:
      return { variant: 'neutral', label: 'Unknown' };
  }
}

export function LogViewer({ stackId, organizationId, resources = [], liveStatusResources, initialSources, variant = 'page', className = '' }: LogViewerProps) {
  const panel = variant === 'panel';
  const [sourceSelectOpen, setSourceSelectOpen] = useState(false);
  // Fit the viewer to the space below whatever chrome sits above it — the
  // offset varies with the stack header, so it's measured, not hardcoded.
  //
  // **A panel does not measure.** It sits in a grid row that is already
  // `minmax(0,1fr)` of a full-height drawer, so the row IS the answer; measuring
  // the window from inside it would set an absolute height on something whose
  // container is already bounded, and the two disagree the moment the drawer's
  // header changes size.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fit = () => {
    const el = rootRef.current;
    if (!el || panel) return;
    el.style.height = `${Math.max(420, window.innerHeight - el.getBoundingClientRect().top)}px`;
  };
  // No deps: chrome above the viewer (stack header, banners) can change size
  // between renders, so every render re-measures.
  useLayoutEffect(fit);
  useLayoutEffect(() => {
    if (panel) return;
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [panel]);
  const [filters, setFilters] = useState<LogFilters>({
    sources: initialSources ?? [],
    timeRange: 'live-4h',
  });

  // Streams only open for Ready resources — the backend rejects the rest with
  // a pre-stream HTTP error that EventSource can't distinguish from an outage.
  const readySources = useMemo(
    () => new Set(readyResourceNames(resources, liveStatusResources)),
    [resources, liveStatusResources],
  );

  const streamSources = useMemo(
    () => filters.sources.filter((s) => readySources.has(s)),
    [filters.sources, readySources],
  );
  const canStream =
    readySources.size > 0 && (filters.sources.length === 0 || streamSources.length > 0);

  // No memo: the hook keys its effect on filter CONTENT, so object identity is free.
  const { logs, connectionStatus, error, retry } = useLogStream({
    stackId,
    organizationId,
    filters: { ...filters, sources: streamSources },
    enabled: canStream,
  });

  const availableSources = useMemo(() => {
    return resources.map(resource => resource.name).filter(Boolean);
  }, [resources]);

  const filteredLogs = useMemo(() => {
    if (filters.sources.length === 0) {
      return logs;
    }
    return logs.filter(log =>
      !log.source || filters.sources.includes(log.source)
    );
  }, [logs, filters.sources]);

  const setSources = (sources: string[]) => {
    setFilters((prev: LogFilters) => ({ ...prev, sources }));
  };

  const setTimeRange = (timeRange: TimeRangeOption) => {
    setFilters((prev: LogFilters) => ({ ...prev, timeRange }));
  };

  const statusInfo = canStream
    ? connectionStatusInfo(connectionStatus)
    : { variant: 'neutral' as StatusVariant, label: 'Waiting' };

  const logText = useMemo(() => {
    return convertLogsToLazyLogFormat(filteredLogs);
  }, [filteredLogs]);

  const toggleSource = (source: string) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...filters.sources, source];
    setSources(newSources);
  };

  const timeRangeOptions: TimeRangeOption[] = [
    'live-4h',
    '30m',
    '1h',
    '4h',
    '24h',
    'all',
  ];

  return (
    <div
      ref={rootRef}
      className={cn(
        'flex w-full min-h-0 flex-col',
        // The page centres itself in the sheet and pays its own inset. The panel
        // is handed a column and fills it — the drawer's 20 is already spent.
        panel ? 'h-full p-5' : 'mx-auto max-w-[1280px] px-[26px] py-5',
        className,
      )}
    >
      {/* Header with integrated filter controls */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {/* **The panel has no heading.** The drawer's own title names the
              resource three rows above this, and `Stack logs` over a stream of
              one service's output would be the wrong noun as well as a second
              one. The connection state keeps its place — that is the only thing
              in this row a reader cannot get from the drawer. */}
          {!panel && <h2 className="text-name font-medium text-foreground">Stack logs</h2>}
          <StatusPill variant={statusInfo.variant}>{statusInfo.label}</StatusPill>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Resources Multi-Select. **Not in a panel** — the source is the
              resource whose drawer you opened, so the control could only ever
              filter away the one thing you asked to see. */}
          {!panel && availableSources.length > 0 && (
            <Popover open={sourceSelectOpen} onOpenChange={setSourceSelectOpen}>
              <PopoverTrigger asChild>
                {/* **Wears the select trigger's own styling, not a Button's.**
                    It is a multi-select sitting beside a single-select, and it
                    was an `outline` Button with `rounded-sm` — a different
                    radius, a different material and a different height from the
                    control right next to it. Same variants in, same object out. */}
                <button
                  type="button"
                  data-slot="select-trigger"
                  data-size="default"
                  data-shape="flat"
                  className={cn(selectTriggerVariants(), 'w-48 justify-start text-meta font-medium')}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Resources
                  <ChevronsUpDown className="ml-auto size-3.5" />
                  {filters.sources.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-meta">
                      {filters.sources.length}
                    </Badge>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search resources..." />
                  <CommandEmpty>No resources found.</CommandEmpty>
                  <CommandGroup>
                    {availableSources.map(source => (
                      <CommandItem
                        key={source}
                        onSelect={() => toggleSource(source)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            filters.sources.includes(source) ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span className="truncate">{source}</span>
                        {!readySources.has(source) && (
                          <span className="ml-auto pl-2 text-label text-fg-muted">not ready</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Time Range Selector */}
          <Select value={filters.timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className={cn('justify-start text-meta font-medium', panel ? 'w-auto' : 'w-48')}>
              <Clock className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {getTimeRangeLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* **The stream sits on the sheet, not in a near-black terminal.** The
          panel was `--code-bg` inside a rounded, fully-bordered box — a second
          surface, a second colour world, and a card floating in a card. On the
          white sheet with one hairline above it, the lines are the content and
          the rule is just where they start. Jaseem's call on the board, Aug 2026. */}
      {!canStream ? (
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title="No ready resources yet"
          description={
            filters.sources.length > 0
              ? 'The selected resources are still starting. Logs will stream once they are ready.'
              : 'Logs will stream once at least one resource is ready.'
          }
        />
      ) : logText ? (
        <div data-slot="log-stream" className="min-h-0 flex-1 overflow-hidden border-t border-border bg-card">
          <div className="h-full">
            <LazyLog
              text={logText}
              extraLines={1}
              // The library's default row is 19px; the board's line is 20.
              rowHeight={20}
              enableSearch
              caseInsensitive
              selectableLines
              follow={filters.timeRange === 'live-4h'}
              height="auto"
              style={{
                backgroundColor: 'var(--card)',
                color: 'var(--fg-2)',
                fontSize: '12px',
                lineHeight: '20px',
                fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            />
          </div>
        </div>
      ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
        <EmptyState
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title={connectionStatus === 'connecting' ? 'Connecting to log stream' : 'Reconnecting to log stream'}
          description="Waiting for the first event to arrive."
        />
      ) : connectionStatus === 'connected' ? (
        <EmptyState
          icon={<ScrollText className="h-6 w-6" />}
          title="No logs yet"
          description="Logs will appear once the stack starts emitting them."
        />
      ) : (
        <EmptyState
          icon={<WifiOff className="h-6 w-6" />}
          title="Disconnected from log stream"
          description="The connection dropped. Try reconnecting."
          action={
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      )}
    </div>
  );
}
