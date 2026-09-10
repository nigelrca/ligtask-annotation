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
    options: ['Safe', 'Unsafe'],
  },
  NLR: {
    label: 'Part 2 — Natural Language Reasoning',
    question: 'Determine whether the prompt violates any applicable policy',
    options: ['Does not Violate Policy', 'Violates Policy'],
  },
  NLG: {
    label: 'Part 3 — Natural Language Generation',
    question: 'Determine whether the LLM should answer or refuse the prompt',
    options: ['Answer', 'Refuse'],
  },
};

export default function AnnotateTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskType = (params.taskType as string).toUpperCase() as TaskType;

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [safetyLabel, setSafetyLabel] = useState<string | null>(null);
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

  const resetForm = () => setSafetyLabel(null);

  const handlePrevious = () => {
    if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); resetForm(); }
  };

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) { setCurrentIndex(currentIndex + 1); resetForm(); }
  };

  const handleSubmit = async () => {
    if (!safetyLabel) { alert('Please select a classification'); return; }

    setSubmitting(true);
    try {
      const result = await submitAnnotationEvaluation({
        promptId: currentPrompt.id,
        safetyLabel,
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

  // Submit on Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && safetyLabel && !submitting) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safetyLabel, submitting]);

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

  // ── Page ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'linear-gradient(to bottom, #F7F7F7, #1C45D5)' }}>
      {/* Top-right Logout */}
      <div className="fixed top-4 right-4 z-50">
        <LogoutButton />
      </div>

      {/* Left Sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 overflow-y-auto flex-shrink-0">
        {/* Back button */}
        <button
          onClick={() => router.push('/annotate')}
          title="Back to overview"
          className="w-12 h-12 flex items-center justify-center mb-4 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-8 border-t border-gray-200 mb-3" />

        {/* Prompt numbers */}
        {prompts.map((prompt, index) => (
          <button
            key={prompt.id}
            onClick={() => { setCurrentIndex(index); resetForm(); }}
            className={`w-12 h-12 flex items-center justify-center mb-2 rounded-lg transition-colors font-medium ${
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
        <div className="flex items-center justify-center p-8 min-h-full">
          <div className="w-full max-w-5xl space-y-4">

            {/* Part label + progress */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
              <p className="text-sm font-semibold text-gray-800">
                {completedInPart}/{prompts.length} annotated
              </p>
            </div>

            {/* Nav arrows */}
            <div className="flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
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

            {/* Quiz Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">

              {/* Context */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-[#1C45D5] mb-4">Context:</h3>
                <div className="space-y-3 text-sm text-gray-800">
                  <p><strong>The nature of the interaction:</strong>{' '}{currentPrompt.context.sender.nature_of_the_interaction}</p>
                  <p><strong>The platform type:</strong>{' '}{currentPrompt.context.sender.platform_type}</p>
                  <p><strong>The user type:</strong>{' '}{currentPrompt.context.recipient.type}</p>
                  
                  {/* Handle background - can be string or object */}
                  {typeof currentPrompt.context.recipient.background === 'object' ? (
                    <div>
                      <p className="font-bold mb-2">The background of the recipient:</p>
                      <div className="ml-4 space-y-1.5">
                        {Object.entries(currentPrompt.context.recipient.background).map(([key, value]) => (
                          <p key={key}>
                            <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong>{' '}
                            {String(value)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p><strong>The background of the recipient:</strong>{' '}{currentPrompt.context.recipient.background}</p>
                  )}
                  
                  {currentPrompt.context.transmission_principle.urgency && (
                    <p><strong>Urgency:</strong>{' '}{currentPrompt.context.transmission_principle.urgency}</p>
                  )}
                  <p><strong>Purpose of the Chatbot:</strong>{' '}{currentPrompt.context.transmission_principle.sender_purpose}</p>
                  <p><strong>Confidentiality of the conversation:</strong>{' '}{currentPrompt.context.transmission_principle.confidentiality}</p>
                </div>
              </div>

              {/* Instruction */}
              {currentPrompt.instruction && (
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-[#1C45D5] mb-3">Instruction:</h3>
                  <p className="text-sm text-gray-800 leading-relaxed">{currentPrompt.instruction}</p>
                </div>
              )}

              {/* English + Filipino */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">English:</h3>
                  <p className="text-gray-800 leading-relaxed">{currentPrompt.english_text}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Filipino:</h3>
                  <p className="text-gray-800 leading-relaxed">{currentPrompt.filipino_text}</p>
                </div>
              </div>

              {/* Classification */}
              <div className="pt-4">
                <h3 className="text-lg font-bold text-red-600 mb-4">{question}</h3>
                <div className="flex gap-4 mb-6">
                  {safetyOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSafetyLabel(option)}
                      className={`flex-1 py-4 px-6 border-2 rounded-xl font-medium text-lg transition-all ${
                        safetyLabel === option
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !safetyLabel}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
