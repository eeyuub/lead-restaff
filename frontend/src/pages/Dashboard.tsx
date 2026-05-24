import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, Radar, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import type { LeadStats, ScrapeJob } from '../lib/types';
import StatusDot from '../components/StatusDot';

export default function Dashboard() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get<LeadStats>('/leads/stats') });
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: () => api.get<ScrapeJob[]>('/scrape-jobs') });

  const total = stats.data?.total ?? 0;
  const aCount = stats.data?.byPriority?.find((p) => p.priority === 'A')?._count ?? 0;
  const newCount = stats.data?.byStatus?.find((s) => s.status === 'NEW')?._count ?? 0;
  const contactedCount = stats.data?.byStatus?.find((s) => s.status === 'CONTACTED')?._count ?? 0;

  return (
    <div className="px-10 py-10 max-w-6xl">
      <header className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400 mb-2">
          Overview
        </p>
        <h2 className="font-display text-5xl text-ink-50 leading-none">
          Dashboard<span className="text-flame">.</span>
        </h2>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-px bg-ink-800 border border-ink-800 mb-10">
        <StatCard label="Total leads" value={total} />
        <StatCard label="Priority A" value={aCount} accent="text-priority-a" />
        <StatCard label="Unworked" value={newCount} />
        <StatCard label="Contacted" value={contactedCount} accent="text-flame" />
      </div>

      {/* Cities + Categories side by side */}
      <div className="grid grid-cols-2 gap-6 mb-10">
        <Panel title="By city" icon={<TrendingUp size={14} />}>
          <BreakdownList
            items={(stats.data?.byCity ?? []).map((c) => ({ label: c.city || '(unknown)', count: c._count }))}
          />
        </Panel>
        <Panel title="By category" icon={<Database size={14} />}>
          <BreakdownList
            items={(stats.data?.byCategory ?? []).map((c) => ({
              label: c.categoryGroup,
              count: c._count,
            }))}
          />
        </Panel>
      </div>

      {/* Recent scrape jobs */}
      <Panel
        title="Recent scrape jobs"
        icon={<Radar size={14} />}
        action={
          <Link to="/scrape" className="text-xs font-mono text-flame hover:text-flame-light flex items-center gap-1">
            New <ArrowRight size={12} />
          </Link>
        }
      >
        <div className="divide-y divide-ink-800">
          {jobs.data?.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-ink-400">
              No scrape jobs yet. <Link to="/scrape" className="text-flame">Launch one</Link>.
            </div>
          )}
          {jobs.data?.slice(0, 6).map((j) => (
            <div key={j.id} className="px-5 py-3 flex items-center gap-4">
              <StatusDot status={j.status} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-100 truncate">
                  {j.cities.join(', ')}{' '}
                  <span className="text-ink-500">·</span>{' '}
                  <span className="text-ink-400">{j.categories.join(', ')}</span>
                </div>
                <div className="font-mono text-[10px] text-ink-500 mt-0.5">
                  {new Date(j.createdAt).toLocaleString()} · {j.zonesUsed.length} queries
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                {j.totalIngested !== null ? (
                  <>
                    <div className="text-priority-a">+{j.totalIngested} new</div>
                    <div className="text-ink-500">{j.totalDuplicates ?? 0} dupes</div>
                  </>
                ) : (
                  <div className="text-ink-500">{j.status.toLowerCase()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-ink-900 px-5 py-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400 mb-2">{label}</p>
      <p className={`stat text-4xl font-light ${accent ?? 'text-ink-50'}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-ink-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-300">
          {icon}
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function BreakdownList({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="px-5 py-3 space-y-2">
      {items.length === 0 && <p className="text-sm text-ink-500">—</p>}
      {items.map((i) => (
        <div key={i.label} className="relative">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-200">{i.label}</span>
            <span className="font-mono text-ink-400">{i.count}</span>
          </div>
          <div className="h-1 bg-ink-800">
            <div
              className="h-full bg-flame/40"
              style={{ width: `${(i.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
