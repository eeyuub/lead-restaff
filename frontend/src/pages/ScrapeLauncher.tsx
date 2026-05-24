import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radar,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Save,
  Trash2,
  BookmarkPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { ScrapeJob, ScrapeTemplate } from '../lib/types';

type Language = 'en' | 'fr' | 'ar';

interface FormState {
  cities: string[];
  zones: string[];
  categories: string[];
  customQueries: string[];
  perZoneLimit: number;
  language: Language;
  minRating: number;
  minReviews: number;
  skipClosedPlaces: boolean;
  scrapeContacts: boolean;
}

const INITIAL: FormState = {
  cities: [],
  zones: [],
  categories: ['restaurant'],
  customQueries: [],
  perZoneLimit: 10,
  language: 'fr',
  minRating: 0,
  minReviews: 0,
  skipClosedPlaces: true,
  scrapeContacts: true,
};

export default function ScrapeLauncher() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const zonesQuery = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.get<Record<string, string[]>>('/scrape-jobs/zones'),
  });
  const catsQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<string[]>('/scrape-jobs/categories'),
  });
  const tplQuery = useQuery({
    queryKey: ['scrape-templates'],
    queryFn: () => api.get<ScrapeTemplate[]>('/scrape-jobs/templates'),
  });

  const [form, setForm] = useState<FormState>(INITIAL);
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});
  const [customQueryDraft, setCustomQueryDraft] = useState('');
  const [tplName, setTplName] = useState('');

  const cityZones = zonesQuery.data ?? {};
  const allCategories = catsQuery.data ?? [];
  const templates = tplQuery.data ?? [];

  // Resolve zones: if user toggled specific zones use those; else expand selected cities.
  const resolvedZones = useMemo(() => {
    if (form.zones.length > 0) return form.zones;
    return form.cities.flatMap((c) => cityZones[c] ?? []);
  }, [form.zones, form.cities, cityZones]);

  const totalQueries = resolvedZones.length * form.categories.length + form.customQueries.length;
  const estimatedPlaces = totalQueries * form.perZoneLimit;
  const estimatedCost = estimatedPlaces * 0.0075;

  const launch = useMutation({
    mutationFn: () =>
      api.post<ScrapeJob>('/scrape-jobs', {
        cities: form.cities,
        categories: form.categories,
        perZoneLimit: form.perZoneLimit,
        zones: form.zones.length ? form.zones : undefined,
        customQueries: form.customQueries.length ? form.customQueries : undefined,
        language: form.language,
        minRating: form.minRating || undefined,
        minReviews: form.minReviews || undefined,
        skipClosedPlaces: form.skipClosedPlaces,
        scrapeContacts: form.scrapeContacts,
      }),
    onSuccess: (job) => {
      toast.success(`Scrape job launched: ${job.id.slice(0, 8)}...`);
      qc.invalidateQueries({ queryKey: ['jobs'] });
      navigate('/dashboard');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveTpl = useMutation({
    mutationFn: () =>
      api.post<ScrapeTemplate>('/scrape-jobs/templates', {
        name: tplName.trim(),
        config: form,
      }),
    onSuccess: () => {
      toast.success('Template saved');
      setTplName('');
      qc.invalidateQueries({ queryKey: ['scrape-templates'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTpl = useMutation({
    mutationFn: (id: string) => api.delete(`/scrape-jobs/templates/${id}`),
    onSuccess: () => {
      toast.success('Template deleted');
      qc.invalidateQueries({ queryKey: ['scrape-templates'] });
    },
  });

  const loadTpl = (tpl: ScrapeTemplate) => {
    setForm({ ...INITIAL, ...tpl.config } as FormState);
    toast.success(`Loaded "${tpl.name}"`);
  };

  const toggleCity = (city: string) => {
    setForm((p) => {
      const isOn = p.cities.includes(city);
      const newCities = isOn ? p.cities.filter((c) => c !== city) : [...p.cities, city];
      // If turning off, remove that city's zones too.
      const zonesOfCity = cityZones[city] ?? [];
      const newZones = isOn ? p.zones.filter((z) => !zonesOfCity.includes(z)) : p.zones;
      return { ...p, cities: newCities, zones: newZones };
    });
  };

  const toggleZone = (zone: string) => {
    setForm((p) => ({
      ...p,
      zones: p.zones.includes(zone) ? p.zones.filter((z) => z !== zone) : [...p.zones, zone],
    }));
  };

  const toggleCat = (cat: string) =>
    setForm((p) => ({
      ...p,
      categories: p.categories.includes(cat)
        ? p.categories.filter((c) => c !== cat)
        : [...p.categories, cat],
    }));

  const addCustomQuery = () => {
    const q = customQueryDraft.trim();
    if (!q) return;
    setForm((p) => ({ ...p, customQueries: [...p.customQueries, q] }));
    setCustomQueryDraft('');
  };

  const canLaunch = totalQueries > 0 && form.perZoneLimit > 0;

  return (
    <div className="px-10 py-10 max-w-5xl">
      <header className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400 mb-2">
          Apify · Google Maps + Contacts
        </p>
        <h2 className="font-display text-5xl text-ink-50 leading-none">
          New scrape<span className="text-flame">.</span>
        </h2>
      </header>

      {/* Templates */}
      <Section number="00" title="Templates">
        <div className="flex flex-wrap gap-2 mb-3">
          {templates.length === 0 && (
            <p className="text-xs text-ink-500">No saved templates yet.</p>
          )}
          {templates.map((t) => (
            <div
              key={t.id}
              className="group inline-flex items-center gap-1 border border-ink-700 hover:border-flame bg-ink-900 text-ink-200"
            >
              <button onClick={() => loadTpl(t)} className="px-3 py-1.5 text-xs">
                {t.name}
              </button>
              <button
                onClick={() => deleteTpl.mutate(t.id)}
                className="px-2 py-1.5 text-ink-500 hover:text-priority-c opacity-0 group-hover:opacity-100"
                title="Delete template"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Template name (e.g. 'casa-restaurants-high-rated')"
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            className="input flex-1 text-xs"
          />
          <button
            onClick={() => saveTpl.mutate()}
            disabled={!tplName.trim() || saveTpl.isPending}
            className="btn btn-ghost text-xs disabled:opacity-30"
          >
            <BookmarkPlus size={12} />
            Save current
          </button>
        </div>
      </Section>

      {/* Cities + zones */}
      <Section number="01" title="Cities & zones">
        <p className="text-xs text-ink-500 mb-3">
          Pick whole cities, or expand to choose specific zones. Picking zones overrides the city's
          default zones.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(cityZones).map((city) => {
            const cityOn = form.cities.includes(city);
            const expanded = expandedCities[city];
            const zones = cityZones[city] ?? [];
            const pickedHere = zones.filter((z) => form.zones.includes(z)).length;
            return (
              <div key={city} className="border border-ink-700 bg-ink-900">
                <div className="flex items-center">
                  <button
                    onClick={() => toggleCity(city)}
                    className={`flex-1 text-left px-3 py-2 ${
                      cityOn ? 'bg-flame/10 text-ink-50' : 'text-ink-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{city}</span>
                    <span className="font-mono text-[10px] text-ink-500 ml-2">
                      {zones.length} zones {pickedHere > 0 ? `· ${pickedHere} picked` : ''}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setExpandedCities((p) => ({ ...p, [city]: !expanded }))
                    }
                    className="px-3 py-2 text-ink-500 hover:text-ink-200"
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>
                {expanded && (
                  <div className="px-3 py-2 border-t border-ink-800 flex flex-wrap gap-1.5">
                    {zones.map((z) => {
                      const on = form.zones.includes(z);
                      return (
                        <button
                          key={z}
                          onClick={() => toggleZone(z)}
                          className={`text-[11px] px-2 py-1 border transition-colors ${
                            on
                              ? 'bg-flame/10 border-flame text-ink-50'
                              : 'border-ink-700 text-ink-300 hover:border-ink-500'
                          }`}
                        >
                          {z}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Categories */}
      <Section number="02" title="Categories">
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => {
            const on = form.categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className={`px-3 py-1.5 text-xs border transition-colors ${
                  on
                    ? 'bg-flame/10 border-flame text-ink-50'
                    : 'bg-ink-900 border-ink-700 text-ink-300 hover:border-ink-500'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Custom queries */}
      <Section number="03" title="Custom queries (optional)">
        <p className="text-xs text-ink-500 mb-2">
          Free-form Google Maps searches appended to the generated ones. E.g. "rooftop bar
          Marrakech".
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={customQueryDraft}
            onChange={(e) => setCustomQueryDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomQuery())}
            placeholder="e.g. spa hotel Marrakech"
            className="input flex-1 text-xs"
          />
          <button onClick={addCustomQuery} className="btn btn-ghost text-xs">
            Add
          </button>
        </div>
        {form.customQueries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.customQueries.map((q, i) => (
              <span
                key={`${q}-${i}`}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-ink-900 border border-ink-700 text-ink-200"
              >
                {q}
                <button
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      customQueries: p.customQueries.filter((_, j) => j !== i),
                    }))
                  }
                  className="text-ink-500 hover:text-priority-c"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Filters & options */}
      <Section number="04" title="Filters & options">
        <div className="grid grid-cols-2 gap-6">
          <Field label={`Places per zone: ${form.perZoneLimit}`}>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={form.perZoneLimit}
              onChange={(e) => setForm((p) => ({ ...p, perZoneLimit: Number(e.target.value) }))}
              className="w-full accent-flame"
            />
          </Field>

          <Field label="Language">
            <select
              value={form.language}
              onChange={(e) =>
                setForm((p) => ({ ...p, language: e.target.value as Language }))
              }
              className="input text-xs w-full"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </Field>

          <Field
            label={`Min rating (Apify): ${form.minRating > 0 ? form.minRating.toFixed(1) : 'any'}`}
          >
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={form.minRating}
              onChange={(e) => setForm((p) => ({ ...p, minRating: Number(e.target.value) }))}
              className="w-full accent-flame"
            />
          </Field>

          <Field
            label={`Min reviews (post-ingest): ${
              form.minReviews > 0 ? form.minReviews : 'any'
            }`}
          >
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={form.minReviews}
              onChange={(e) => setForm((p) => ({ ...p, minReviews: Number(e.target.value) }))}
              className="w-full accent-flame"
            />
          </Field>

          <Toggle
            label="Skip closed places"
            value={form.skipClosedPlaces}
            onChange={(v) => setForm((p) => ({ ...p, skipClosedPlaces: v }))}
          />
          <Toggle
            label="Scrape contact info (emails, socials)"
            value={form.scrapeContacts}
            onChange={(v) => setForm((p) => ({ ...p, scrapeContacts: v }))}
          />
        </div>
      </Section>

      {/* Estimate */}
      <div className="card mb-6">
        <div className="px-5 py-3 border-b border-ink-800 text-xs font-mono uppercase tracking-wider text-ink-300">
          Run estimate
        </div>
        <div className="grid grid-cols-4 gap-px bg-ink-800">
          <Estimate label="Search queries" value={totalQueries.toString()} />
          <Estimate label="Max places (pre-dedup)" value={estimatedPlaces.toLocaleString()} />
          <Estimate
            label="Estimated cost"
            value={`$${estimatedCost.toFixed(2)}`}
            accent="text-flame"
          />
          <Estimate
            label="Runtime (rough)"
            value={`${Math.max(1, Math.ceil(totalQueries / 3))} min`}
          />
        </div>
      </div>

      {estimatedCost > 20 && (
        <div className="flex items-start gap-2 text-xs text-priority-c bg-priority-c/5 border border-priority-c/30 px-4 py-3 mb-6">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          Estimated cost is over $20. Consider lowering places/zone or fewer cities at once.
        </div>
      )}

      <button
        disabled={!canLaunch || launch.isPending}
        onClick={() => launch.mutate()}
        className="btn btn-primary text-base px-6 py-3 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {launch.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Launching...
          </>
        ) : (
          <>
            <Radar size={16} />
            Launch scrape
          </>
        )}
      </button>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono text-[10px] text-ink-500">{number}</span>
        <h3 className="font-display text-2xl italic text-ink-100">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500 mb-2">{label}</p>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-flame"
      />
      <span className="text-xs text-ink-200">{label}</span>
    </label>
  );
}

function Estimate({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-ink-900 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500 mb-1">{label}</p>
      <p className={`stat text-lg ${accent ?? 'text-ink-100'}`}>{value}</p>
    </div>
  );
}
