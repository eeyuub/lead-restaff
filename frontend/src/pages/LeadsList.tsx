import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ExternalLink, Phone, Mail, Send } from 'lucide-react';
import { api } from '../lib/api';
import type { CategoryGroup, Lead, LeadStatus, Priority } from '../lib/types';
import { LEAD_STATUSES } from '../lib/types';
import BulkSendModal from '../components/BulkSendModal';

const PRIORITIES: Priority[] = ['A', 'B', 'C', 'D'];
const CATEGORIES: CategoryGroup[] = ['HOTEL', 'RESTAURANT', 'CAFE', 'OTHER'];

export default function LeadsList() {
  const [city, setCity] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [categoryGroup, setCategoryGroup] = useState<CategoryGroup | ''>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['leads', { city, priority, status, categoryGroup, search }],
    queryFn: () =>
      api.get<{ items: Lead[]; total: number }>('/leads', {
        city: city || undefined,
        priority: priority || undefined,
        status: status || undefined,
        categoryGroup: categoryGroup || undefined,
        search: search || undefined,
        take: 100,
      }),
  });

  const cities = useQuery({
    queryKey: ['stats-cities'],
    queryFn: () => api.get<{ byCity: { city: string; _count: number }[] }>('/leads/stats'),
    select: (d) => d.byCity.map((c) => c.city).filter(Boolean),
  });

  const allVisibleIds = data?.items.map((l) => l.id) ?? [];
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allVisibleIds));
  }

  const selectedLeads = useMemo(
    () => data?.items.filter((l) => selected.has(l.id)) ?? [],
    [data?.items, selected],
  );

  return (
    <div className="px-10 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400 mb-2">
            {data?.total ?? 0} total · {selected.size} selected
          </p>
          <h2 className="font-display text-5xl text-ink-50 leading-none">
            Leads<span className="text-flame">.</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <Link to="/outreach/jobs" className="btn-ghost text-sm">
            Outreach jobs
          </Link>
          {selected.size > 0 && (
            <button
              onClick={() => setBulkOpen(true)}
              className="btn-primary flex items-center gap-1.5"
            >
              <Send size={14} />
              Send WhatsApp · {selected.size}
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            placeholder="Search name, phone, email, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="select">
          <option value="">All cities</option>
          {cities.data?.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={categoryGroup}
          onChange={(e) => setCategoryGroup(e.target.value as CategoryGroup | '')}
          className="select"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority | '')}
          className="select"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              Priority {p}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus | '')}
          className="select"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left">
                <Th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all visible"
                  />
                </Th>
                <Th>Priority</Th>
                <Th>Name</Th>
                <Th>City</Th>
                <Th>Type</Th>
                <Th>Contact</Th>
                <Th>Rating</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  checked={selected.has(lead.id)}
                  onToggle={() => toggle(lead.id)}
                />
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-ink-500">
                    No leads match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {bulkOpen && (
        <BulkSendModal leads={selectedLeads} onClose={() => setBulkOpen(false)} />
      )}
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

function LeadRow({
  lead,
  checked,
  onToggle,
}: {
  lead: Lead;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-ink-800/50 hover:bg-ink-900 transition-colors group">
      <td className="px-4 py-3">
        <input type="checkbox" checked={checked} onChange={onToggle} />
      </td>
      <td className="px-4 py-3">
        <span className={`badge badge-${lead.priority.toLowerCase()}`}>{lead.priority}</span>
      </td>
      <td className="px-4 py-3">
        <Link to={`/leads/${lead.id}`} className="text-ink-100 hover:text-flame font-medium">
          {lead.name}
        </Link>
        {lead.neighborhood && (
          <div className="text-[10px] font-mono text-ink-500 mt-0.5">{lead.neighborhood}</div>
        )}
      </td>
      <td className="px-4 py-3 text-ink-200">{lead.city}</td>
      <td className="px-4 py-3 text-ink-300 text-xs">{lead.subCategory ?? lead.categoryGroup}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          {lead.phone && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-ink-200">
              <Phone size={10} className="text-ink-500" />
              {lead.phone}
            </span>
          )}
          {lead.emailPrimary && (
            <span className="flex items-center gap-1.5 text-xs text-ink-300 truncate max-w-[200px]">
              <Mail size={10} className="text-ink-500" />
              {lead.emailPrimary}
            </span>
          )}
          {!lead.phone && !lead.emailPrimary && <span className="text-xs text-ink-600">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs">
        {lead.rating ? (
          <>
            <span className="text-ink-100">{lead.rating.toFixed(1)}</span>
            <span className="text-ink-500"> · {lead.reviewsCount ?? 0}</span>
          </>
        ) : (
          <span className="text-ink-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
          {lead.status.replace(/_/g, ' ').toLowerCase()}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/leads/${lead.id}`}
          className="opacity-0 group-hover:opacity-100 text-flame hover:text-flame-light"
        >
          <ExternalLink size={14} />
        </Link>
      </td>
    </tr>
  );
}
