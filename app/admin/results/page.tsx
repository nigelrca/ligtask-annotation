'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getEvaluationStats, getRecentEvaluations, deleteEvaluation, deleteAllEvaluations } from '@/app/actions/admin';

interface Evaluation {
  id: string;
  submitted_at: string;
  translation_correct: boolean | null;
  revised_translation: string | null;
  safety_label: string | null;
  users: { user_id: string; name: string; role: string } | null;
  prompts: { base_id: string; task_instance_id: string; task_type: string; category: string } | null;
}

type TabType = 'all' | 'translations' | 'annotations';

export default function AdminResultsPage() {
  const [stats, setStats] = useState({ total: 0, translations: 0, annotations: 0 });
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    Promise.all([getEvaluationStats(), getRecentEvaluations()]).then(
      ([statsData, evalData]) => {
        setStats(statsData);
        setEvaluations(evalData as unknown as Evaluation[]);
        setLoading(false);
      }
    );
  }, []);

  const filtered = evaluations.filter(e => {
    if (activeTab === 'translations') return e.translation_correct !== null;
    if (activeTab === 'annotations') return e.safety_label !== null;
    return true;
  });

  function handleExport() {
    const rows = filtered.map(e => ({
      evaluation_id: e.id,
      base_id: e.prompts?.base_id ?? '',
      task_instance_id: e.prompts?.task_instance_id ?? '',
      task_type: e.prompts?.task_type ?? '',
      category: e.prompts?.category ?? '',
      annotator_id: e.users?.user_id ?? '',
      annotator_name: e.users?.name ?? '',
      role: e.users?.role ?? '',
      translation_correct: e.translation_correct ?? '',
      revised_translation: e.revised_translation ?? '',
      safety_label: e.safety_label ?? '',
      submitted_at: e.submitted_at,
    }));

    const headers = Object.keys(rows[0] ?? {}).join(',');
    const csv = [
      headers,
      ...rows.map(r =>
        Object.values(r)
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ligtask-results-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteEvaluation(id);
    setEvaluations(prev => prev.filter(e => e.id !== id));
    setStats(prev => ({
      ...prev,
      total: prev.total - 1,
    }));
    if (expandedId === id) setExpandedId(null);
    setDeletingId(null);
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    await deleteAllEvaluations();
    setEvaluations([]);
    setStats({ total: 0, translations: 0, annotations: 0 });
    setExpandedId(null);
    setDeletingAll(false);
    setShowDeleteAllModal(false);
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'translations', label: 'Translations', count: stats.translations },
    { key: 'annotations', label: 'Annotations', count: stats.annotations },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Evaluation Results</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteAllModal(true)}
              disabled={evaluations.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete All
            </button>
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Evaluations</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Translation Reviews</p>
            <p className="text-3xl font-bold text-blue-600">{stats.translations}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Safety Annotations</p>
            <p className="text-3xl font-bold text-purple-600">{stats.annotations}</p>
          </div>
        </div>

        {/* Tabs + Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Tab Bar */}
          <div className="border-b border-gray-200 flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No evaluations yet.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Base ID', 'Task Instance ID', 'Task', 'Annotator', 'Result', 'Submitted', '', ''].map((h, i) => (
                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(e => (
                  <React.Fragment key={e.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                        {e.prompts?.base_id ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                        {e.prompts?.task_instance_id ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          e.prompts?.task_type === 'NLU' ? 'bg-blue-100 text-blue-800' :
                          e.prompts?.task_type === 'NLR' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {e.prompts?.task_type ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <p className="font-medium">{e.users?.user_id ?? '—'}</p>
                        <p className="text-xs text-gray-500">{e.users?.name ?? ''}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {e.safety_label ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ['Safe', 'Does not Violate Policy', 'Answer'].includes(e.safety_label)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {e.safety_label}
                          </span>
                        ) : e.translation_correct !== null ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            e.translation_correct ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {e.translation_correct ? 'Correct' : 'Revised'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(e.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {expandedId === e.id ? '▲' : '▼'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={e2 => { e2.stopPropagation(); handleDelete(e.id); }}
                          disabled={deletingId === e.id}
                          title="Delete this result"
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {deletingId === e.id ? (
                            <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded row — shows revision if present */}
                    {expandedId === e.id && (
                      <tr key={`${e.id}-expanded`} className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4 space-y-2 text-sm">
                          <p><span className="font-medium text-gray-700">Category:</span> {e.prompts?.category ?? '—'}</p>
                          {e.revised_translation && (
                            <p>
                              <span className="font-medium text-gray-700">Revised Translation:</span>{' '}
                              {e.revised_translation}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Delete All Results?</h2>
                <p className="text-sm text-gray-500">This will permanently remove all {stats.total} evaluation records. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                disabled={deletingAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deletingAll && (
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
