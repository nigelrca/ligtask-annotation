'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Prompt, TaskType } from '@/types/database';
import LogoutButton from '@/app/components/LogoutButton';
import { submitAnnotationEvaluation, getCompletedPromptIds } from '@/app/actions/evaluations';
import { getPromptsForAnnotation } from '@/app/actions/prompts';

const TASK_META: Record<string, { label: string; question: string; options: string[] }> = {
  NLU: {
    label: 'Part 1 — Natural Language Understanding',
    question: 'Classify if the prompt is safe or unsafe',
    options: ['Unsafe', 'Safe'],
  },
  NLR: {
    label: 'Part 2 — Natural Language Reasoning',
    question: 'Determine whether the prompt violates any applicable policy',
    options: ['Violates Policy', 'Does not Violate Policy'],
  },
  NLG: {
    label: 'Part 3 — Natural Language Generation',
    question: 'Determine whether the LLM should answer or refuse the prompt',
    options: ['Refuse', 'Answer'],
  },
};

// Maps each option label to a semantic color intent
const OPTION_INTENT: Record<string, 'positive' | 'negative'> = {
  'Safe': 'positive',
  'Unsafe': 'negative',
  'Does not Violate Policy': 'positive',
  'Violates Policy': 'negative',
  'Answer': 'positive',
  'Refuse': 'negative',
};

export default function AnnotateTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskType = (params.taskType as string).toUpperCase() as TaskType;

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [safetyLabel, setSafetyLabel] = useState<string | null>(null);
  const [safetyRating, setSafetyRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const meta = TASK_META[taskType];

  useEffect(() => {
    if (!meta) {
      router.replace('/annotate');
      return;
    }

    Promise.all([getPromptsForAnnotation(taskType), getCompletedPromptIds()]).then(([allPrompts, ids]) => {
      setPrompts(allPrompts as Prompt[]);
      setCompletedIds(new Set(ids));
      setLoading(false);
    });
  }, [taskType]);

  const currentPrompt = prompts[currentIndex];

  const resetForm = () => { setSafetyLabel(null); setSafetyRating(null); };

  const handlePrevious = () => {
    if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); resetForm(); }
  };

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) { setCurrentIndex(currentIndex + 1); resetForm(); }
  };

  const handleSubmit = async () => {
    if (!safetyLabel) { alert('Please select a classification'); return; }
    if (!safetyRating) { alert('Please select a safety rating (1–10)'); return; }

    setSubmitting(true);
    try {
      const result = await submitAnnotationEvaluation({
        promptId: currentPrompt.id,
        safetyLabel,
        safetyRating,
      });

      if (!result.success) { alert(`Failed to save: ${result.error}`); return; }

      setCompletedIds(prev => new Set(prev).add(currentPrompt.id));

      if (currentIndex < prompts.length - 1) {
        handleNext();
      } else {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const completedInPart = prompts.filter(p => completedIds.has(p.id)).length;
  const progressPct = prompts.length > 0 ? Math.round((completedInPart / prompts.length) * 100) : 0;

  // Submit on Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && safetyLabel && safetyRating && !submitting) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safetyLabel, safetyRating, submitting]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #F7F7F7, #1C45D5)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (!currentPrompt) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #F7F7F7, #1C45D5)' }}>
        <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
          <p className="text-gray-600 mb-4">No prompts available for this task type.</p>
          <button onClick={() => router.push('/annotate')} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  const { question, options: safetyOptions } = meta;
  const ctx = currentPrompt.context;

  // ── Page ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'linear-gradient(to bottom, #F7F7F7, #1C45D5)' }}>
      {/* Top-right Logout */}
      <div className="fixed top-4 right-4 z-50">
        <LogoutButton />
      </div>

      {/* Left Sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 overflow-y-auto flex-shrink-0">
        <button
          onClick={() => router.push('/annotate')}
          title="Back to overview"
          className="w-12 h-12 flex items-center justify-center mb-4 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-8 border-t border-gray-200 mb-3" />

        {prompts.map((prompt, index) => (
          <button
            key={prompt.id}
            onClick={() => { setCurrentIndex(index); resetForm(); }}
            className={`w-12 h-12 flex items-center justify-center mb-2 rounded-lg transition-colors font-medium text-xs ${
              index === currentIndex
                ? 'text-white'
                : completedIds.has(prompt.id)
                ? 'text-gray-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={
              index === currentIndex
                ? { backgroundColor: '#1C45D5' }
                : completedIds.has(prompt.id)
                ? { backgroundColor: '#B2E3FF' }
                : undefined
            }
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-start justify-center p-8 min-h-full">
          <div className="w-full max-w-5xl space-y-4">

            {/* Header: part label + progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
                <p className="text-sm font-semibold text-gray-800">
                  {completedInPart}/{prompts.length} annotated
                </p>
              </div>
              <div className="w-full h-1.5 bg-white/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, backgroundColor: '#1C45D5' }}
                />
              </div>
            </div>

            {/* Nav arrows */}
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-600 font-medium">
                Item {currentIndex + 1} of {prompts.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex === prompts.length - 1}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

              {/* ── CONTEXT ──────────────────────────────────────── */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base">📍</span>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Context</h3>
                </div>
                <div className="space-y-3">
                  <ContextGroup
                    title="Sender"
                    color="blue"
                    rows={[
                      { label: 'Nature of interaction', value: ctx.sender.nature_of_the_interaction },
                      { label: 'Platform type', value: ctx.sender.platform_type },
                    ]}
                  />
                  <ContextGroup
                    title="Recipient"
                    color="purple"
                    rows={[
                      { label: 'User type', value: ctx.recipient.type },
                      ...(typeof ctx.recipient.background === 'string'
                        ? [{ label: 'Background', value: ctx.recipient.background }]
                        : typeof ctx.recipient.background === 'object' && ctx.recipient.background !== null
                        ? Object.entries(ctx.recipient.background as Record<string, string>).map(([k, v]) => ({
                            label: k.replace(/_/g, ' '),
                            value: v,
                          }))
                        : []),
                    ]}
                  />
                  <ContextGroup
                    title="Transmission"
                    color="green"
                    rows={[
                      ...(ctx.transmission_principle.urgency
                        ? [{ label: 'Urgency', value: ctx.transmission_principle.urgency }]
                        : []),
                      { label: 'Chatbot purpose', value: ctx.transmission_principle.sender_purpose },
                      { label: 'Confidentiality', value: ctx.transmission_principle.confidentiality },
                    ]}
                  />
                </div>
              </div>

              {/* ── INSTRUCTION ──────────────────────────────────── */}
              {currentPrompt.instruction && (
                <div
                  className="px-6 py-5 border-b border-gray-100"
                  style={{ borderLeft: '4px solid #F59E0B', background: '#FFFBEB' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📋</span>
                    <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest">Instruction</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{currentPrompt.instruction}</p>
                </div>
              )}

              {/* ── EN / FIL PROMPTS ─────────────────────────────── */}
              <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg leading-none">🇺🇸</span>
                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest">English</h3>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{currentPrompt.english_text}</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg leading-none">🇵🇭</span>
                    <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest">Filipino</h3>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{currentPrompt.filipino_text}</p>
                </div>
              </div>

              {/* ── CLASSIFICATION ───────────────────────────────── */}
              <div className="p-6">
                {/* Binary label */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base">🏷️</span>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{question}</h3>
                </div>

                <div className="flex gap-3 mb-6">
                  {safetyOptions.map((option) => {
                    const intent = OPTION_INTENT[option] ?? 'positive';
                    const isSelected = safetyLabel === option;
                    const isPos = intent === 'positive';

                    const base =
                      'flex-1 py-4 px-6 rounded-xl font-semibold text-sm transition-all border-2 flex items-center justify-center gap-2 cursor-pointer';
                    const selected = isPos
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-red-500 bg-red-50 text-red-800';
                    const unselected = isPos
                      ? 'border-gray-200 bg-gray-50 text-gray-600 hover:border-green-300 hover:bg-green-50'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-red-300 hover:bg-red-50';

                    return (
                      <button
                        key={option}
                        onClick={() => setSafetyLabel(option)}
                        className={`${base} ${isSelected ? selected : unselected}`}
                      >
                        {isPos ? (
                          <svg
                            className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-green-600' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg
                            className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-red-500' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {option}
                      </button>
                    );
                  })}
                </div>

                {/* 1–10 Rating scale */}
                <RatingScale value={safetyRating} onChange={setSafetyRating} />

                {/* Submit */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Press Enter to submit</p>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !safetyLabel || !safetyRating}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Submit
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ContextRow {
  label: string;
  value: string;
}

interface ContextGroupProps {
  title: string;
  color: 'blue' | 'purple' | 'green';
  rows: ContextRow[];
}

const COLOR_MAP = {
  blue:   { bg: '#EFF6FF', border: '#BFDBFE', title: '#1D4ED8' },
  purple: { bg: '#F5F3FF', border: '#DDD6FE', title: '#6D28D9' },
  green:  { bg: '#F0FDF4', border: '#BBF7D0', title: '#15803D' },
};

function ContextGroup({ title, color, rows }: ContextGroupProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      className="rounded-xl overflow-hidden text-sm"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="px-4 py-2" style={{ borderBottom: `1px solid ${c.border}` }}>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: c.title }}>
          {title}
        </span>
      </div>
      <div>
        {rows.map(({ label, value }, i) => (
          <div
            key={label}
            className="px-4 py-2.5 flex gap-4"
            style={i > 0 ? { borderTop: `1px solid ${c.border}` } : undefined}
          >
            <span
              className="text-xs font-semibold capitalize flex-shrink-0 w-40 pt-0.5"
              style={{ color: c.title }}
            >
              {label}
            </span>
            <span className="text-gray-700 leading-relaxed text-sm">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RatingScale ───────────────────────────────────────────────────────────────
// 1–10 safety rating: 1 = most unsafe (red), 10 = most safe (green).

type RatingZone = { bg: string; activeBg: string; text: string; activeText: string; border: string; activeBorder: string; shadow: string };

const RATING_COLORS: Record<number, RatingZone> = {
  1:  { bg: '#FEF2F2', activeBg: '#DC2626', text: '#991B1B', activeText: '#FFFFFF', border: '#FECACA', activeBorder: '#991B1B', shadow: '#DC262650' },
  2:  { bg: '#FEF2F2', activeBg: '#EF4444', text: '#991B1B', activeText: '#FFFFFF', border: '#FECACA', activeBorder: '#DC2626', shadow: '#EF444450' },
  3:  { bg: '#FFF7ED', activeBg: '#F97316', text: '#9A3412', activeText: '#FFFFFF', border: '#FED7AA', activeBorder: '#EA580C', shadow: '#F9731650' },
  4:  { bg: '#FFFBEB', activeBg: '#F59E0B', text: '#92400E', activeText: '#FFFFFF', border: '#FDE68A', activeBorder: '#D97706', shadow: '#F59E0B50' },
  5:  { bg: '#FFFBEB', activeBg: '#F59E0B', text: '#92400E', activeText: '#FFFFFF', border: '#FDE68A', activeBorder: '#D97706', shadow: '#F59E0B50' },
  6:  { bg: '#FFFBEB', activeBg: '#EAB308', text: '#854D0E', activeText: '#FFFFFF', border: '#FEF08A', activeBorder: '#CA8A04', shadow: '#EAB30850' },
  7:  { bg: '#F0FDF4', activeBg: '#22C55E', text: '#166534', activeText: '#FFFFFF', border: '#BBF7D0', activeBorder: '#16A34A', shadow: '#22C55E50' },
  8:  { bg: '#F0FDF4', activeBg: '#16A34A', text: '#166534', activeText: '#FFFFFF', border: '#BBF7D0', activeBorder: '#15803D', shadow: '#16A34A50' },
  9:  { bg: '#F0FDF4', activeBg: '#15803D', text: '#166534', activeText: '#FFFFFF', border: '#BBF7D0', activeBorder: '#166534', shadow: '#15803D50' },
  10: { bg: '#F0FDF4', activeBg: '#14532D', text: '#14532D', activeText: '#FFFFFF', border: '#86EFAC', activeBorder: '#14532D', shadow: '#14532D50' },
};

function RatingScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const selectedZone = value ? RATING_COLORS[value] : null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">⭐</span>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Safety rating
        </h3>
        {value && selectedZone && (
          <span
            className="ml-auto text-xs font-bold text-white px-3 py-0.5 rounded-full shadow-sm transition-all"
            style={{ backgroundColor: selectedZone.activeBg }}
          >
            {value} / 10 {value <= 2 ? '— Highly Unsafe' : value <= 3 ? '— Unsafe' : value <= 6 ? '— Ambiguous / Moderate' : value <= 8 ? '— Safe' : '— Very Safe'}
          </span>
        )}
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const c = RATING_COLORS[n];
          const isSelected = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              title={n === 1 ? '1 - Most unsafe' : n === 10 ? '10 - Safest' : `Rating ${n}`}
              className="flex-1 h-12 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: isSelected ? c.activeBg : c.bg,
                border: `2px solid ${isSelected ? c.activeBorder : c.border}`,
                color: isSelected ? c.activeText : c.text,
                transform: isSelected ? 'translateY(-2px)' : 'none',
                boxShadow: isSelected ? `0 6px 16px ${c.shadow}` : 'none',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Endpoint labels */}
      <div className="flex justify-between mt-2 px-0.5">
        <span className="text-xs font-semibold" style={{ color: '#DC2626' }}>← 1 (Most unsafe)</span>
        <span className="text-xs font-semibold" style={{ color: '#15803D' }}>10 (Safest) →</span>
      </div>
    </div>
  );
}
