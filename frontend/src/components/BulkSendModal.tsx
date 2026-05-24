import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Send } from 'lucide-react';
import { api } from '../lib/api';
import type { OutreachJob, Lead } from '../lib/types';

interface Props {
  leads: Lead[];
  onClose: () => void;
}

export default function BulkSendModal({ leads, onClose }: Props) {
  const [body, setBody] = useState(
    'Bonjour {{name}}, je suis Restaff — on aide les restaurants à {{city}} à recruter rapidement du personnel qualifié. Quelques minutes pour discuter ?',
  );
  const [throttleSec, setThrottleSec] = useState(8);
  const [skipUncontactable, setSkipUncontactable] = useState(true);
  const navigate = useNavigate();

  const m = useMutation({
    mutationFn: () =>
      api.post<OutreachJob>('/outreach/jobs', {
        leadIds: leads.map((l) => l.id),
        body,
        throttleMs: throttleSec * 1000,
        skipUncontactable,
        channel: 'WHATSAPP',
        autoStart: true,
      }),
    onSuccess: (job) => navigate(`/outreach/jobs/${job.id}`),
  });

  const preview = leads[0]
    ? body.replace(/\{\{\s*name\s*\}\}/g, leads[0].name).replace(/\{\{\s*city\s*\}\}/g, leads[0].city)
    : body;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="card max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-ink-50">
            Bulk WhatsApp · <span className="text-flame">{leads.length}</span> leads
          </h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100">
            <X size={18} />
          </button>
        </div>

        <label className="block mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-400">
          Message body — supports {`{{name}}`} {`{{city}}`}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="input w-full mb-3"
        />

        {leads[0] && (
          <div className="mb-4 p-3 rounded bg-ink-900 text-xs text-ink-200">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-500 mb-1">
              Preview · {leads[0].name}
            </div>
            <div className="whitespace-pre-wrap">{preview}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-400">
              Throttle (seconds between sends)
            </label>
            <input
              type="number"
              min={2}
              max={300}
              value={throttleSec}
              onChange={(e) => setThrottleSec(Math.max(2, +e.target.value || 2))}
              className="input w-full"
            />
          </div>
          <label className="flex items-end gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={skipUncontactable}
              onChange={(e) => setSkipUncontactable(e.target.checked)}
              className="mt-2"
            />
            Skip REJECTED / DO_NOT_CONTACT
          </label>
        </div>

        {m.error && (
          <div className="mb-3 text-xs text-red-400">{(m.error as Error).message}</div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending || body.trim().length < 5}
            className="btn-primary flex items-center gap-1.5"
          >
            <Send size={14} />
            {m.isPending ? 'Launching…' : `Launch · ${leads.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
