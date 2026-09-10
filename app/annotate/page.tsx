'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/app/components/LogoutButton';
import { getCompletedPromptIds } from '@/app/actions/evaluations';
import { getPromptsForAnnotation } from '@/app/actions/prompts';
import { Prompt } from '@/types/database';

const PARTS = [
  {
    taskType: 'NLU',
    label: 'Part 1: Natural Language Understanding (NLU)',
    description: 'Classify whether the prompt is Safe or Unsafe given the provided context.',
  },
  {
    taskType: 'NLR',
    label: 'Part 2: Natural Language Reasoning (NLR)',
    description: 'Determine whether the prompt violates any applicable policy given the provided context.',
  },
  {
    taskType: 'NLG',
    label: 'Part 3: Natural Language Generation (NLG)',
    description: 'Determine whether the LLM should answer or refuse the prompt given the provided context.',
  },
];

const INSTRUCTIONS = [
  {
    heading: 'What is this task?',
    body: 'You will be evaluating a set of English–Filipino bilingual prompts to assess their safety in context. Each prompt is accompanied by a detailed context describing the sender, recipient, and purpose of the interaction.',
  },
  {
    heading: 'How to answer',
    body: 'Read the full context carefully before making a judgment. Your classification should be based on whether the prompt is appropriate given that specific context — not on the surface-level content alone.',
  },
  {
    heading: 'NLU prompts',
    body: 'Choose Safe if the prompt is appropriate given the context. Choose Unsafe if the prompt poses a risk or harm regardless of context.',
  },
  {
    heading: 'NLR prompts',
    body: 'Choose Does not Violate Policy if the prompt is permissible in the given context. Choose Violates Policy if the prompt breaches applicable guidelines.',
  },
  {
    heading: 'NLG prompts',
    body: 'Choose Answer if an LLM should respond to the prompt in this context. Choose Refuse if the LLM should decline to respond.',
  },
  {
    heading: 'Saving your progress',
    body: 'Your answers are saved automatically after each submission. You can leave and return at any time — your progress will be restored.',
  },
];

export default function AnnotateHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // Map of taskType -> { completed: number, total: number }
  const [progress, setProgress] = useState<Record<string, { completed: number; total: number }>>({
    NLU: { completed: 0, total: 0 },
    NLR: { completed: 0, total: 0 },
    NLG: { completed: 0, total: 0 },
  });

  useEffect(() => {
    Promise.all([getPromptsForAnnotation(), getCompletedPromptIds()]).then(([prompts, completedIds]) => {
      const completedSet = new Set(completedIds);

      const counts: Record<string, { completed: number; total: number }> = {
        NLU: { completed: 0, total: 0 },
        NLR: { completed: 0, total: 0 },
        NLG: { completed: 0, total: 0 },
      };

      (prompts as Prompt[]).forEach((p) => {
        if (!counts[p.task_type]) return;
        counts[p.task_type].total += 1;
        if (completedSet.has(p.id)) counts[p.task_type].completed += 1;
      });

      setProgress(counts);
      setLoading(false);
    });
  }, []);

  const totalCompleted = Object.values(progress).reduce((sum, p) => sum + p.completed, 0);
  const totalPrompts = Object.values(progress).reduce((sum, p) => sum + p.total, 0);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(to bottom, #F7F7F7, #1C45D5)' }}
    >
      {/* Top bar */}
      <div className="flex justify-end p-4">
        <LogoutButton />
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-[#1C45D5] mb-2">Welcome!</h1>
            {loading ? (
              <p className="text-sm text-gray-400">Loading your progress...</p>
            ) : (
              <p className="text-sm text-gray-500">
                Overall progress:{' '}
                <span className="font-semibold text-gray-700">{totalCompleted}/{totalPrompts}</span> prompts annotated
              </p>
            )}
          </div>

          {/* Instructions accordion */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Instructions</h2>
            {INSTRUCTIONS.map((item, i) => (
              <InstructionItem key={i} heading={item.heading} body={item.body} />
            ))}
          </div>

          {/* Parts */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dataset Parts</h2>
            {PARTS.map((part) => {
              const p = progress[part.taskType];
              const isComplete = !loading && p.total > 0 && p.completed === p.total;

              return (
                <button
                  key={part.taskType}
                  onClick={() => router.push(`/annotate/${part.taskType}`)}
                  className="w-full text-left bg-blue-50 hover:bg-blue-100 rounded-xl px-5 py-4 transition-colors border border-blue-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{part.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{part.description}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                      {loading ? (
                        <span className="text-gray-300">—</span>
                      ) : isComplete ? (
                        <>
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-green-600">{p.completed}/{p.total}</span>
                        </>
                      ) : (
                        <span>{p.completed}/{p.total}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

// Collapsible instruction item
function InstructionItem({ heading, body }: { heading: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-800">{heading}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-gray-700 bg-white leading-relaxed">
          {body}
        </div>
      )}
    </div>
  );
}
