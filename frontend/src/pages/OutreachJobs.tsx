import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import type { OutreachJob } from '../lib/types';

export default function OutreachJobs() {
  const { data } = useQuery({
    queryKey: ['outreach-jobs'],
    queryFn: () => api.get<OutreachJob[]>('/outreach/jobs'),
    refetchInterval: 5_000,
  });

  return (
    <div className="px-10 py-10">
      <Link
        to="/leads"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-400 hover:text-ink-100 mb-6"
      >
        <ArrowLeft size={12} />
        Leads
      </Link>

      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400 mb-2">
          {data?.length ?? 0} jobs
        </p>
        <h2 className="font-display text-5xl text-ink-50 leading-none">
          Outreach jobs<span className="text-flame">.</span>
        </h2>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-left">
              <Th>Created</Th>
              <Th>Channel</Th>
              <Th>Status</Th>
              <Th>Progress</Th>
              <Th>Throttle</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {data?.map((j) => (
              <tr key={j.id} className="border-b border-ink-800/50 hover:bg-ink-900 group">
                <td className="px-4 py-3 font-mono text-xs text-ink-300">
                  {new Date(j.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs">{j.channel}</td>
                <td className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-ink-300">
                  {j.status.toLowerCase()}
                </td>
                <td className="px-4 py-3 text-xs">
                  <ProgressBar job={j} />
                </td>
                <td className="px-4 py-3 text-xs font-mono text-ink-400">
                  {j.throttleMs / 1000}s
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/outreach/jobs/${j.id}`}
                    className="text-flame hover:text-flame-light text-xs"
                  >
                    open →
                  </Link>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-ink-500">
                  No bulk jobs yet. Select leads on the Leads page → <Send size={12} className="inline" /> Send WhatsApp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-400 font-normal">
      {children}
    </th>
  );
}

export function ProgressBar({ job }: { job: OutreachJob }) {
  const done = job.sent + job.failed + job.skipped;
  const pct = job.total === 0 ? 0 : Math.round((done / job.total) * 100);
  return (
    <div className="min-w-[160px]">
      <div className="h-1.5 bg-ink-800 rounded overflow-hidden mb-1">
        <div className="h-full bg-flame" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-3 font-mono text-[10px] text-ink-500">
        <span className="text-ink-200">{done}</span>/{job.total}
        <span>· sent {job.sent}</span>
        {job.failed > 0 && <span className="text-red-400">· failed {job.failed}</span>}
        {job.skipped > 0 && <span>· skipped {job.skipped}</span>}
      </div>
    </div>
  );
}
