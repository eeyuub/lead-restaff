import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

interface Props {
  leadId: string;
  onClose: () => void;
}

export default function LogReplyModal({ leadId, onClose }: Props) {
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [subject, setSubject] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: () =>
      api.post(`/leads/${leadId}/outreach/messages/log`, {
        direction: 'INBOUND',
        channel,
        body,
        subject: channel === 'EMAIL' && subject ? subject : undefined,
        occurredAt: new Date(occurredAt).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      qc.invalidateQueries({ queryKey: ['timeline', leadId] });
      toast.success('Reply logged');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="card max-w-xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-ink-50 flex items-center gap-2">
            <Inbox size={18} className="text-flame" />
            Log incoming reply
          </h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          {(['WHATSAPP', 'EMAIL'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors ${
                channel === c
                  ? 'bg-flame/10 border-flame text-flame'
                  : 'bg-ink-900 border-ink-700 text-ink-300 hover:border-ink-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {channel === 'EMAIL' && (
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input w-full mb-2"
          />
        )}

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Paste / type the reply here"
          className="input w-full mb-3"
        />

        <label className="block mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-400">
          Received at
        </label>
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          className="input w-full mb-4"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending || body.trim().length < 1}
            className="btn-primary"
          >
            {m.isPending ? 'Logging…' : 'Log reply'}
          </button>
        </div>
      </div>
    </div>
  );
}
