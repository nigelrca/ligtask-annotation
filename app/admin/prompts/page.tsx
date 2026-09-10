'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminPrompts, getPromptCompletionStats } from '@/app/actions/admin';

interface Prompt {
  id: string;
  base_id: string;
  task_instance_id: string;
  english_text: string;
  task_type: 'NLU' | 'NLR' | 'NLG';
  category: string;
  created_at: string;
}

interface PromptStat {
  base_id: string;
  task_type: string;
  category: string;
  evaluations: { id: string }[];
}

const TASK_TYPE_COLORS = {
  NLU: 'bg-blue-100 text-blue-800',
  NLR: 'bg-orange-100 text-orange-800',
  NLG: 'bg-purple-100 text-purple-800',
};

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTask, setFilterTask] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminPrompts(), getPromptCompletionStats()]).then(
      ([promptData, statData]) => {
        setPrompts(promptData as Prompt[]);

        // Build a map of base_id -> evaluation count
        const map: Record<string, number> = {};
        (statData as PromptStat[]).forEach(p => {
          map[p.base_id] = p.evaluations.length;
        });
        setStats(map);
        setLoading(false);
      }
    );
  }, []);

  const filtered = prompts.filter(p => {
    const matchesSearch =
      p.base_id.toLowerCase().includes(search.toLowerCase()) ||
      p.english_text.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesTask = filterTask === 'ALL' || p.task_type === filterTask;
    return matchesSearch && matchesTask;
  });

  const totalByType = {
    NLU: prompts.filter(p => p.task_type === 'NLU').length,
    NLR: prompts.filter(p => p.task_type === 'NLR').length,
    NLG: prompts.filter(p => p.task_type === 'NLG').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Prompt Management</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Prompts</p>
            <p className="text-3xl font-bold text-gray-900">{prompts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">NLU</p>
            <p className="text-3xl font-bold text-blue-600">{totalByType.NLU}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">NLR</p>
            <p className="text-3xl font-bold text-orange-600">{totalByType.NLR}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">NLG</p>
            <p className="text-3xl font-bold text-purple-600">{totalByType.NLG}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 flex gap-4 items-center">
          <input
            type="text"
            placeholder="Search by ID, text, or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {['ALL', 'NLU', 'NLR', 'NLG'].map(type => (
              <button
                key={type}
                onClick={() => setFilterTask(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterTask === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Prompts Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {filtered.length} of {prompts.length} prompts
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Base ID', 'Task Instance ID', 'English Text', 'Task Type', 'Category', 'Evaluations'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(prompt => (
                  <>
                    <tr
                      key={prompt.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                        {prompt.base_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                        {prompt.task_instance_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <p className="truncate">{prompt.english_text}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${TASK_TYPE_COLORS[prompt.task_type]}`}>
                          {prompt.task_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        <p className="truncate">{prompt.category}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats[prompt.base_id] ?? 0}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expandedId === prompt.id && (
                      <tr key={`${prompt.id}-expanded`} className="bg-blue-50">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Full English Text:</p>
                          <p className="text-sm text-gray-900">{prompt.english_text}</p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
