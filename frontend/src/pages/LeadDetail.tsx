import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  MapPin,
  Star,
  Sparkles,
  Send,
  Save,
  Loader2,
  Check,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type {
  Lead,
  LeadStatus,
  OutreachMessage,
  RejectionReason,
  Timeline as TimelineData,
} from '../lib/types';
import { LEAD_STATUSES, REJECTION_REASONS } from '../lib/types';
import StatusDot from '../components/StatusDot';
import Timeline from '../components/Timeline';
import LogReplyModal from '../components/LogReplyModal';

type Lang = 'fr' | 'en' | 'darija';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const leadQuery = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get<Lead>(`/leads/${id}`),
    enabled: !!id,
  });

  const [language, setLanguage] = useState<Lang>('fr');
  const [customInstructions, setCustomInstructions] = useState('');
  const [draft, setDraft] = useState('');
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [pendingReason, setPendingReason] = useState<RejectionReason | ''>('');
  const [pendingNote, setPendingNote] = useState('');

  const timelineQuery = useQuery({
    queryKey: ['timeline', id],
    queryFn: () => api.get<TimelineData>(`/leads/${id}/timeline`),
    enabled: !!id,
    refetchInterval: 10_000,
  });

  const generate = useMutation({
    mutationFn: () =>
      api.post<{ body: string; promptUsed: string }>(
        `/leads/${id}/outreach/generate`,
        { language, customInstructions: customInstructions || undefined },
      ),
    onSuccess: (data) => {
      setDraft(data.body);
      setSavedDraftId(null); // new draft, hasn't been saved yet
      toast.success('Message generated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveDraft = useMutation({
    mutationFn: () =>
      api.post<OutreachMessage>(`/leads/${id}/outreach/drafts`, {
        body: draft,
        generatedBy: 'AI',
        promptUsed: undefined,
      }),
    onSuccess: (msg) => {
      setSavedDraftId(msg.id);
      qc.invalidateQueries({ queryKey: ['lead', id] });
      toast.success('Draft saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const send = useMutation({
    mutationFn: async () => {
      let messageId = savedDraftId;
      if (!messageId) {
        const saved = await api.post<OutreachMessage>(`/leads/${id}/outreach/drafts`, {
          body: draft,
          generatedBy: 'AI',
        });
        messageId = saved.id;
      }
      return api.post(`/leads/${id}/outreach/messages/${messageId}/send`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', id] });
      setDraft('');
      setSavedDraftId(null);
      toast.success('WhatsApp message sent');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: (payload: {
      status: LeadStatus;
      rejectionReason?: RejectionReason;
      statusNote?: string;
    }) => api.patch<Lead>(`/leads/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', id] });
      qc.invalidateQueries({ queryKey: ['timeline', id] });
      setPendingStatus(null);
      setPendingReason('');
      setPendingNote('');
      toast.success('Status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function applyStatus(s: LeadStatus) {
    if (s === 'REJECTED') {
      setPendingStatus(s);
      return;
    }
    updateStatus.mutate({ status: s, statusNote: pendingNote || undefined });
  }

  if (leadQuery.isLoading) {
    return <div className="px-10 py-10 text-ink-400">Loading…</div>;
  }
  if (!leadQuery.data) {
    return <div className="px-10 py-10 text-ink-400">Not found</div>;
  }
  const lead = leadQuery.data;

  return (
    <div className="px-10 py-10 max-w-6xl">
      {/* Back */}
      <Link
        to="/leads"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-400 hover:text-ink-100 mb-6"
      >
        <ArrowLeft size={12} />
        All leads
      </Link>

      {/* Header */}
      <header className="mb-8 pb-6 border-b border-ink-800">
        <div className="flex items-baseline gap-3 mb-2">
          <span className={`badge badge-${lead.priority.toLowerCase()}`}>Priority {lead.priority}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
            score {lead.qualityScore}/9
          </span>
          <StatusDot status={lead.status} />
        </div>
        <h2 className="font-display text-4xl text-ink-50 leading-tight">{lead.name}</h2>
        <p className="text-sm text-ink-400 mt-2">
          {lead.subCategory ?? lead.categoryGroup}
          {lead.neighborhood && <> · {lead.neighborhood}</>} · {lead.city}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: contact info */}
        <div className="col-span-1 space-y-4">
          <Panel title="Contact">
            <div className="px-4 py-3 space-y-3">
              <Field icon={<Phone size={12} />} label="Phone" value={lead.phone} mono />
              <Field icon={<Mail size={12} />} label="Email" value={lead.emailPrimary} />
              {lead.emails.length > 1 && (
                <div className="pl-5">
                  {lead.emails.slice(1).map((e) => (
                    <div key={e} className="text-xs text-ink-400 truncate">{e}</div>
                  ))}
                </div>
              )}
              <Field
                icon={<Globe size={12} />}
                label="Website"
                value={lead.website}
                link={lead.website ?? undefined}
              />
              <Field
                icon={<Instagram size={12} />}
                label="Instagram"
                value={lead.instagram}
                link={lead.instagram ?? undefined}
              />
              <Field
                icon={<Facebook size={12} />}
                label="Facebook"
                value={lead.facebook}
                link={lead.facebook ?? undefined}
              />
            </div>
          </Panel>

          <Panel title="Location">
            <div className="px-4 py-3 space-y-2 text-xs">
              <div className="flex items-start gap-2 text-ink-200">
                <MapPin size={12} className="mt-0.5 text-ink-500 flex-shrink-0" />
                <span>{lead.address ?? '—'}</span>
              </div>
              {lead.lat && lead.lng && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-flame hover:text-flame-light text-xs font-mono inline-block"
                >
                  open in maps →
                </a>
              )}
            </div>
          </Panel>

          <Panel title="Quality">
            <div className="px-4 py-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-400">Rating</span>
                <span className="font-mono text-ink-100">
                  {lead.rating ? (
                    <>
                      <Star size={10} className="inline -translate-y-0.5 text-priority-b" />{' '}
                      {lead.rating.toFixed(1)} · {lead.reviewsCount} reviews
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-400">Quality score</span>
                <span className="font-mono text-ink-100">{lead.qualityScore}/9</span>
              </div>
            </div>
          </Panel>

          <Panel title="Qualification">
            <div className="px-4 py-3 space-y-2">
              {LEAD_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => applyStatus(s)}
                  className={`w-full text-left text-xs px-2 py-1.5 transition-colors ${
                    lead.status === s
                      ? 'bg-flame/10 text-flame border-l-2 border-flame'
                      : 'text-ink-300 hover:bg-ink-800 border-l-2 border-transparent'
                  }`}
                >
                  {lead.status === s && <Check size={10} className="inline mr-1" />}
                  {s.replace(/_/g, ' ').toLowerCase()}
                </button>
              ))}
              {pendingStatus === 'REJECTED' && (
                <div className="mt-3 p-3 bg-ink-900 rounded space-y-2">
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-ink-400">
                    Rejection reason
                  </label>
                  <select
                    value={pendingReason}
                    onChange={(e) => setPendingReason(e.target.value as RejectionReason | '')}
                    className="select w-full"
                  >
                    <option value="">Choose reason…</option>
                    {REJECTION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={pendingNote}
                    onChange={(e) => setPendingNote(e.target.value)}
                    rows={2}
                    placeholder="Note (optional)"
                    className="input w-full text-xs"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setPendingStatus(null);
                        setPendingReason('');
                      }}
                      className="btn-ghost text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        updateStatus.mutate({
                          status: 'REJECTED',
                          rejectionReason: pendingReason || undefined,
                          statusNote: pendingNote || undefined,
                        })
                      }
                      disabled={!pendingReason}
                      className="btn-primary text-xs disabled:opacity-30"
                    >
                      Confirm reject
                    </button>
                  </div>
                </div>
              )}
              {lead.status === 'REJECTED' && lead.rejectionReason && (
                <div className="mt-2 text-[10px] font-mono text-ink-500">
                  reason: <span className="text-ink-300">{lead.rejectionReason}</span>
                  {lead.rejectionNote && <> · {lead.rejectionNote}</>}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Right: outreach */}
        <div className="col-span-2 space-y-4">
          {/* Generator */}
          <Panel
            title="Generate WhatsApp message"
            icon={<Sparkles size={14} className="text-flame" />}
          >
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                {(['fr', 'en', 'darija'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors ${
                      language === l
                        ? 'bg-flame/10 border-flame text-flame'
                        : 'bg-ink-900 border-ink-700 text-ink-300 hover:border-ink-500'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Custom angle (optional) — e.g. 'mention they're new on the scene'"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="input w-full"
              />
              <button
                onClick={() => generate.mutate()}
                disabled={generate.isPending || !lead.phone}
                className="btn btn-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate with AI
                  </>
                )}
              </button>
              {!lead.phone && (
                <p className="text-xs text-priority-c">
                  No phone number on this lead — WhatsApp send unavailable.
                </p>
              )}
            </div>
          </Panel>

          {/* Draft + send */}
          {draft && (
            <Panel title="Draft">
              <div className="p-4">
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setSavedDraftId(null);
                  }}
                  rows={8}
                  className="textarea w-full"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => saveDraft.mutate()}
                    disabled={saveDraft.isPending || !!savedDraftId}
                    className="btn btn-ghost"
                  >
                    {savedDraftId ? <Check size={12} /> : <Save size={12} />}
                    {savedDraftId ? 'Saved' : 'Save draft'}
                  </button>
                  <button
                    onClick={() => send.mutate()}
                    disabled={send.isPending || !lead.phone}
                    className="btn btn-primary disabled:opacity-30"
                  >
                    {send.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    Send via WhatsApp
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {/* Timeline */}
          <Panel
            title={`Timeline (${timelineQuery.data?.items.length ?? 0})`}
            icon={
              <button
                onClick={() => setLogOpen(true)}
                className="ml-auto flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-flame hover:text-flame-light"
              >
                <Inbox size={11} />
                Log reply
              </button>
            }
          >
            <Timeline data={timelineQuery.data} />
          </Panel>
        </div>
      </div>
      {logOpen && id && <LogReplyModal leadId={id} onClose={() => setLogOpen(false)} />}
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="px-4 py-2.5 border-b border-ink-800 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-300">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  link,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  link?: string;
  mono?: boolean;
}) {
  if (!value) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-ink-500">{icon}</span>
        <span className="text-ink-400">{label}</span>
        <span className="text-ink-600 ml-auto">—</span>
      </div>
    );
  }
  const content = (
    <span className={`${mono ? 'font-mono' : ''} text-ink-100 truncate`}>{value}</span>
  );
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-ink-500">{icon}</span>
      <span className="text-ink-400 flex-shrink-0">{label}</span>
      <span className="ml-auto min-w-0 max-w-[200px]">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-flame hover:text-flame-light truncate block"
          >
            {value}
          </a>
        ) : (
          content
        )}
      </span>
    </div>
  );
}
