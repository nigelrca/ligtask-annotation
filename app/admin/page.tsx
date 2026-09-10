'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoutButton from '@/app/components/LogoutButton';
import { getUsers } from '@/app/actions/admin';
import { getAdminPrompts } from '@/app/actions/admin';
import { getEvaluationStats } from '@/app/actions/admin';

export default function AdminPage() {
  const [stats, setStats] = useState({
    users: 0,
    prompts: 0,
    evaluations: 0,
    translations: 0,
    annotations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getUsers(),
      getAdminPrompts(),
      getEvaluationStats(),
    ]).then(([users, prompts, evalStats]) => {
      setStats({
        users: (users as unknown[]).length,
        prompts: (prompts as unknown[]).length,
        evaluations: evalStats.total,
        translations: evalStats.translations,
        annotations: evalStats.annotations,
      });
      setLoading(false);
    });
  }, []);

  const cards = [
    {
      title: 'Users',
      href: '/admin/users',
      stat: stats.users,
      label: 'registered users',
      color: 'text-blue-600',
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      description: 'Create, edit, and manage user accounts and roles',
    },
    {
      title: 'Prompts',
      href: '/admin/prompts',
      stat: stats.prompts,
      label: 'prompts in dataset',
      color: 'text-green-600',
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      description: 'Browse and search dataset prompts by type and category',
    },
    {
      title: 'Results',
      href: '/admin/results',
      stat: stats.evaluations,
      label: 'total evaluations',
      color: 'text-purple-600',
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'View and export translation and annotation results',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Nav Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(card => (
            <Link key={card.title} href={card.href}>
              <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-gray-900">{card.title}</h2>
                  {card.icon}
                </div>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mb-2" />
                ) : (
                  <p className={`text-3xl font-bold ${card.color} mb-1`}>{card.stat}</p>
                )}
                <p className="text-xs text-gray-400 mb-3">{card.label}</p>
                <p className="text-sm text-gray-600">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Breakdown</h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700 font-medium">Translation Reviews</p>
                <p className="text-3xl font-bold text-blue-900">{stats.translations}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-700 font-medium">Safety Annotations</p>
                <p className="text-3xl font-bold text-purple-900">{stats.annotations}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
