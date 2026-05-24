const COLORS: Record<string, string> = {
  PENDING: 'bg-ink-500',
  RUNNING: 'bg-flame animate-pulse-soft',
  SUCCEEDED: 'bg-priority-a',
  FAILED: 'bg-red-500',
  ABORTED: 'bg-ink-600',
  NEW: 'bg-ink-400',
  CONTACTED: 'bg-flame',
  RESPONDED: 'bg-priority-a',
  CONVERTED: 'bg-priority-a',
  REJECTED: 'bg-red-500',
  DO_NOT_CONTACT: 'bg-red-700',
  DRAFT: 'bg-ink-400',
  SENT: 'bg-flame',
};

export default function StatusDot({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-300">
      <span className={`w-1.5 h-1.5 rounded-full ${COLORS[status] ?? 'bg-ink-500'}`} />
      {status.toLowerCase()}
    </span>
  );
}
