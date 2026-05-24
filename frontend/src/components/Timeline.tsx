import { ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react';
import type { Timeline as TimelineData, TimelineItem } from '../lib/types';

export default function Timeline({ data }: { data: TimelineData | undefined }) {
  if (!data) {
    return <div className="px-4 py-6 text-sm text-ink-500 text-center">Loading…</div>;
  }
  if (data.items.length === 0) {
    return <div className="px-4 py-6 text-sm text-ink-500 text-center">No activity yet.</div>;
  }
  return (
    <div className="divide-y divide-ink-800">
      {data.items.map((it) => (
        <Row key={`${it.kind}-${it.data.id}`} item={it} />
      ))}
    </div>
  );
}

function Row({ item }: { item: TimelineItem }) {
  if (item.kind === 'status') {
    const c = item.data;
    return (
      <div className="px-4 py-2.5 flex items-center gap-2 text-xs text-ink-300 bg-ink-900/30">
        <Activity size={11} className="text-ink-500" />
        <span className="font-mono">
          {c.fromStatus ? c.fromStatus.replace(/_/g, ' ').toLowerCase() : '—'} →{' '}
          <span className="text-flame">{c.toStatus.replace(/_/g, ' ').toLowerCase()}</span>
        </span>
        {c.reason && <span className="font-mono text-[10px] text-ink-500">· {c.reason}</span>}
        {c.note && <span className="text-ink-400">· {c.note}</span>}
        <span className="ml-auto font-mono text-[10px] text-ink-500">
          {new Date(c.createdAt).toLocaleString()}
        </span>
      </div>
    );
  }

  const m = item.data;
  const inbound = m.direction === 'INBOUND';
  return (
    <div className={`px-4 py-3 ${inbound ? 'bg-flame/5' : ''}`}>
      <div className="flex items-center justify-between mb-2 text-[10px] font-mono uppercase tracking-wider">
        <span
          className={`flex items-center gap-1 ${inbound ? 'text-flame' : 'text-ink-400'}`}
        >
          {inbound ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
          {inbound ? 'inbound' : 'outbound'} · {m.channel.toLowerCase()} ·{' '}
          <span className="text-ink-500">{m.status.toLowerCase()}</span>
          {m.generatedBy === 'AI' && <span className="text-ink-500">· ai</span>}
        </span>
        <span className="text-ink-500">{new Date(m.createdAt).toLocaleString()}</span>
      </div>
      {m.subject && (
        <div className="text-xs text-ink-100 font-medium mb-1">{m.subject}</div>
      )}
      <pre className="font-mono text-xs text-ink-200 whitespace-pre-wrap leading-relaxed">
        {m.body}
      </pre>
      {m.errorMessage && <p className="mt-2 text-xs text-red-400">{m.errorMessage}</p>}
    </div>
  );
}
