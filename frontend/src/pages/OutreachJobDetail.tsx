import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pause, Play, X, Check, AlertCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { OutreachJob, OutreachJobItem, OutreachJobItemStatus } from '../lib/types';
import { ProgressBar } from './OutreachJobs';

export default function OutreachJobDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: job } = useQuery({
    queryKey: ['outreach-job', id],
    queryFn: () => api.get<OutreachJob>(`/outreach/jobs/${id}`),
    enabled: !!id,
    refetchInterval: (q) => {
      const j = q.state.data as OutreachJob | undefined;
      return j && (j.status === 'RUNNING' || j.status === 'QUEUED') ? 2000 : false;
    },
  });

  const mkAction = (path: string) => ({
    mutationFn: () => api.post(`/outreach/jobs/${id}/${path}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach-job', id] });
      qc.invalidateQueries({ queryKey: ['outreach-jobs'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const start = useMutation(mkAction('start'));
  const pause = useMutation(mkAction('pause'));
  const resume = useMutation(mkAction('resume'));
  const cancel = useMutation(mkAction('cancel'));

  if (!job) return <div className="px-10 py-10 text-ink-400">Loading…</div>;

  return (
    <div className="px-10 py-10 max-w-5xl">
      <Link
        to="/outreach/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-400 hover:text-ink-100 mb-6"
      >
        <ArrowLeft size={12} />
        All jobs
      </Link>

      <header className="mb-8 pb-6 border-b border-ink-800 flex items-start justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400 mb-2">
            {job.channel} · throttle {job.throttleMs / 1000}s · started{' '}
            {job.startedAt ? new Date(job.startedAt).toLocaleString() : '—'}
          </p>
          <h2 className="font-display text-4xl text-ink-50 leading-none">
            {job.name ?? `Job ${job.id.slice(0, 8)}`}
          </h2>
          <p className="text-xs font-mono uppercase tracking-wider text-ink-300 mt-2">
            status: <span className="text-flame">{job.status.toLowerCase()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {job.status === 'QUEUED' && (
            <button onClick={() => start.mutate()} className="btn-primary">
              <Play size={14} />
              Start
            </button>
          )}
          {job.status === 'RUNNING' && (
            <button onClick={() => pause.mutate()} className="btn-ghost">
              <Pause size={14} />
              Pause
            </button>
          )}
          {job.status === 'PAUSED' && (
            <button onClick={() => resume.mutate()} className="btn-primary">
              <Play size={14} />
              Resume
            </button>
          )}
          {(job.status === 'RUNNING' || job.status === 'PAUSED' || job.status === 'QUEUED') && (
            <button onClick={() => cancel.mutate()} className="btn-ghost text-red-400">
              <X size={14} />
              Cancel
            </button>
          )}
        </div>
      </header>

      <div className="mb-6 card p-4">
        <ProgressBar job={job} />
      </div>

      <div className="card mb-6 p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-500 mb-2">
          Body template
        </div>
        <pre className="font-mono text-xs text-ink-200 whitespace-pre-wrap">{job.body}</pre>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-left">
              <Th>Lead</Th>
              <Th>City</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th>Attempted</Th>
              <Th>Error</Th>
            </tr>
          </thead>
          <tbody>
            {job.items?.map((it) => (
              <ItemRow key={it.id} item={it} />
            ))}
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

const STATUS_ICON: Record<OutreachJobItemStatus, JSX.Element> = {
  PENDING: <span className="text-ink-500">·</span>,
  SENT: <Check size={12} className="text-green-400" />,
  FAILED: <AlertCircle size={12} className="text-red-400" />,
  SKIPPED: <MinusCircle size={12} className="text-ink-500" />,
};

function ItemRow({ item }: { item: OutreachJobItem }) {
  return (
    <tr className="border-b border-ink-800/50 hover:bg-ink-900">
      <td className="px-4 py-2.5">
        <Link to={`/leads/${item.leadId}`} className="text-ink-100 hover:text-flame text-sm">
          {item.lead?.name ?? item.leadId}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-xs text-ink-300">{item.lead?.city ?? '—'}</td>
      <td className="px-4 py-2.5 text-xs font-mono text-ink-300">{item.lead?.phone ?? '—'}</td>
      <td className="px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-300">
          {STATUS_ICON[item.status]}
          {item.status.toLowerCase()}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs font-mono text-ink-400">
        {item.attemptedAt ? new Date(item.attemptedAt).toLocaleTimeString() : '—'}
      </td>
      <td className="px-4 py-2.5 text-xs text-red-400 max-w-[260px] truncate">
        {item.errorMessage ?? ''}
      </td>
    </tr>
  );
}
