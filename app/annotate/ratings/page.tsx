'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/app/components/LogoutButton';
import { getAnnotationsNeedingRating, updateSafetyRating } from '@/app/actions/evaluations';

interface AnnotationTodo {
  evaluationId: string;
  promptId: string;
  baseId: string;
  taskInstanceId: string;
  taskType: string;
  safetyLabel: string;
  englishText: string;
  filipinoText: string;
}

const RATING_COLORS: Record<number, { bg: string; activeBg: string; text: string; activeText: string; border: string; activeBorder: string }> = {
  1:  { bg: '#FEF2F2', activeBg: '#DC2626', text: '#991B1B', activeText: '#FFFFFF', border: '#FECACA', activeBorder: '#991B1B' },
  2:  { bg: '#FEF2F2', activeBg: '#EF4444', text: '#991B1B', activeText: '#FFFFFF', border: '#FECACA', activeBorder: '#DC2626' },
  3:  { bg: '#FFF7ED', activeBg: '#F97316', text: '#9A3412', activeText: '#FFFFFF', border: '#FED7AA', activeBorder: '#EA580C' },
  4:  { bg: '#FFFBEB', activeBg: '#F59E0B', text: '#92400E', activeText: '#FFFFFF', border: '#FDE68A', activeBorder: '#D97706' },
  5:  { bg: '#FFFBEB', activeBg: '#F59E0B', text: '#92400E', activeText: '#FFFFFF', border: '#FDE68A', activeBorder: '#D97706' },
  6:  { bg: '#FFFBEB', activeBg: '#EAB308', text: '#854D0E', activeText: '#FFFFFF', border: '#FEF08A', activeBorder: '#CA8A04' },
  7:  { bg: '#F0FDF4', activeBg: '#22C55E', text: '#166534', activeText: '#FFFFFF', border: '#BBF7D0', activeBorder: '#16A34A' },
  8:  { bg: '#F0FDF4', activeBg: '#16A34A', text: '#166534', activeText: '#FFFFFF', border: '#BBF7D0', activeBorder: '#15803D' },
  9:  { bg: '#F0FDF4', activeBg: '#15803D', text: '#166534', activeText: '#FFFFFF', border: '#BBF7D0', activeBorder: '#166534' },
  10: { bg: '#F0FDF4', activeBg: '#14532D', text: '#14532D', activeText: '#FFFFFF', border: '#86EFAC', activeBorder: '#14532D' },
};

const LABEL_INTENT: Record<string, 'positive' | 'negative'> = {
  'Safe': 'positive',
  'Does not Violate Policy': 'positive',
  'Answer': 'positive',
  'Unsafe': 'negative',
  'Violates Policy': 'negative',
  'Refuse': 'negative',
};

// Derive the suggested band from the safety label
// Negative labels → 1–5 (unsafe side), Positive → 6–10 (safe side)
function getDerivedBand(safetyLabel: string): '1-5' | '6-10' {
  return LABEL_INTENT[safetyLabel] === 'negative' ? '1-5' : '6-10';
}

const UNSAFE_RATINGS = [1, 2, 3, 4, 5];
const SAFE_RATINGS   = [6, 7, 8, 9, 10];

export default function RatingsRecoveryPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<AnnotationTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    getAnnotationsNeedingRating().then((data) => {
      setTodos(data as AnnotationTodo[]);
      setLoading(false);
    });
  }, []);

  const current = todos[currentIndex];
  const total = todos.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const band = current ? getDerivedBand(current.safetyLabel) : '6-10';
  const suggestedRatings = band === '1-5' ? UNSAFE_RATINGS : SAFE_RATINGS;

  const handleSubmit = useCallback(async () => {
    if (!current || !rating || submitting) return;
    setSubmitting(true);
    try {
      const result = await updateSafetyRating({ evaluationId: current.evaluationId, rating });
      if (!result.success) { alert(`Failed to save: ${result.error}`); return; }
      setDoneCount(d => d + 1);
      setRating(null);
      if (currentIndex < todos.length - 1) {
        setCurrentIndex(i => i + 1);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [current, rating, submitting, currentIndex, todos.length]);

  // Keyboard shortcuts:
  // 1–9  → select that rating
  // 0    → select rating 10
  // Enter → submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= '1' && e.key <= '9') {
        setRating(parseInt(e.key));
      } else if (e.key === '0') {
        setRating(10);
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #F7F7F7, #1C45D5)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your annotations...</p>
        </div>
      </div>
    );
  }

  if (total === 0 || (doneCount === total && total > 0)) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #F7F7F7, #1C45D5)' }}>
        <div className="bg-white rounded-2xl p-10 text-center shadow-xl max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All ratings done!</h2>
          <p className="text-gray-500 mb-6">All your safety ratings have been saved successfully.</p>
          <button onClick={() => router.push('/annotate')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 cursor-pointer">
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  const isPositive = current ? LABEL_INTENT[current.safetyLabel] === 'positive' : true;

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'linear-gradient(to bottom, #F7F7F7, #1C45D5)' }}>
      <div className="fixed top-4 right-4 z-50"><LogoutButton /></div>

      {/* Slim sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 overflow-y-auto flex-shrink-0">
        <button onClick={() => router.push('/annotate')} title="Back" className="w-12 h-12 flex items-center justify-center mb-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-8 border-t border-gray-200 mb-3" />
        {todos.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentIndex(i); setRating(null); }}
            className="w-12 h-12 flex items-center justify-center mb-2 rounded-lg font-medium text-xs cursor-pointer transition-colors"
            style={
              i === currentIndex
                ? { backgroundColor: '#1C45D5', color: '#fff' }
                : i < doneCount
                ? { backgroundColor: '#B2E3FF', color: '#1e40af' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }
            }
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-start justify-center p-8 min-h-full">
          <div className="w-full max-w-3xl space-y-4">

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">⭐ Safety Rating Recovery</p>
                <p className="text-sm font-semibold text-gray-800">{doneCount}/{total} rated</p>
              </div>
              <div className="w-full h-1.5 bg-white/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, backgroundColor: '#1C45D5' }} />
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="bg-white/70 rounded-xl px-4 py-2 text-xs text-gray-600 flex items-center gap-2">
              <span>⌨️</span>
              <span>
                Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-mono font-bold">1</kbd>–<kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-mono font-bold">9</kbd> to select rating,{' '}
                <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-mono font-bold">0</kbd> for 10,{' '}
                <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-mono font-bold">Enter</kbd> to save
              </span>
            </div>

            {/* Nav */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); setRating(null); } }}
                disabled={currentIndex === 0}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-700 font-semibold">Item {currentIndex + 1} of {total}</span>
              <button
                onClick={() => { if (currentIndex < todos.length - 1) { setCurrentIndex(i => i + 1); setRating(null); } }}
                disabled={currentIndex === todos.length - 1}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {current && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

                {/* Prompt header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      current.taskType === 'NLU' ? 'bg-blue-100 text-blue-800' :
                      current.taskType === 'NLR' ? 'bg-orange-100 text-orange-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>{current.taskType}</span>
                    <span className="font-mono text-sm text-gray-600">{current.taskInstanceId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Their existing binary label */}
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {current.safetyLabel}
                    </span>
                    {/* Derived band hint */}
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      band === '1-5'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      Suggested range: {band}
                    </span>
                  </div>
                </div>

                {/* Prompt text */}
                <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🇺🇸</span>
                      <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest">English</h3>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{current.englishText}</p>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🇵🇭</span>
                      <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest">Filipino</h3>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{current.filipinoText}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">⭐</span>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Safety rating (1–10)</h3>
                    {rating && (
                      <span className="ml-auto text-xs font-bold text-white px-3 py-0.5 rounded-full" style={{ backgroundColor: RATING_COLORS[rating].activeBg }}>
                        {rating} / 10 {rating <= 2 ? '— Highly Unsafe' : rating <= 3 ? '— Unsafe' : rating <= 6 ? '— Ambiguous / Moderate' : rating <= 8 ? '— Safe' : '— Very Safe'}
                      </span>
                    )}
                  </div>

                  {/* Band guide */}
                  <div className={`mb-4 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    band === '1-5'
                      ? 'bg-red-50 border border-red-100 text-red-700'
                      : 'bg-green-50 border border-green-100 text-green-700'
                  }`}>
                    <span className="text-sm">{band === '1-5' ? '🔴' : '🟢'}</span>
                    <span>
                      Based on your <strong>{current.safetyLabel}</strong> label, your rating should be in the{' '}
                      <strong>{band}</strong> range.{' '}
                      {band === '1-5'
                        ? 'Pick a lower number if the prompt is very clearly unsafe, higher if it\'s borderline.'
                        : 'Pick a higher number if the prompt is very clearly safe, lower if it\'s borderline.'}
                    </span>
                  </div>

                  <div className="flex gap-1.5 mb-2">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                      const c = RATING_COLORS[n];
                      const isSelected = rating === n;
                      const isInBand = suggestedRatings.includes(n);
                      return (
                        <button
                          key={n}
                          onClick={() => setRating(n)}
                          className="flex-1 h-12 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer relative"
                          style={{
                            background: isSelected ? c.activeBg : c.bg,
                            border: `2px solid ${isSelected ? c.activeBorder : isInBand ? c.activeBorder : c.border}`,
                            color: isSelected ? c.activeText : c.text,
                            transform: isSelected ? 'translateY(-2px)' : 'none',
                            boxShadow: isSelected ? `0 6px 16px ${c.activeBg}50` : 'none',
                            opacity: isInBand ? 1 : 0.4,
                          }}
                        >
                          {n}
                          {isInBand && !isSelected && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: c.activeBg }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between px-0.5 mb-6">
                    <span className="text-xs font-semibold" style={{ color: '#DC2626' }}>← 1 (Most unsafe)</span>
                    <span className="text-xs font-semibold" style={{ color: '#15803D' }}>10 (Safest) →</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Press Enter to submit</p>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !rating}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                      ) : (
                        <>Save Rating <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
