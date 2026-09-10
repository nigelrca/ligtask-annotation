'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUsers, createUser, setUserActive, deleteUser, getUserProgress } from '@/app/actions/admin';
import { UserRole } from '@/types/database';

interface User {
  id: string;
  user_id: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

interface UserProgress {
  id: string;
  user_id: string;
  name: string;
  role: UserRole;
  active: boolean;
  annotated: number;
  translated: number;
  totalAnnotations: number;
  totalTranslations: number;
}

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  TRANSLATOR: 'bg-blue-100 text-blue-800',
  ANNOTATOR: 'bg-green-100 text-green-800',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Create user form state
  const [newUserId, setNewUserId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ANNOTATOR');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const [data, progressData] = await Promise.all([getUsers(), getUserProgress()]);
    setUsers(data as User[]);
    setProgress(progressData as UserProgress[]);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!newUserId.trim() || !newName.trim() || !newPassword.trim()) {
      setFormError('All fields are required');
      return;
    }

    setCreating(true);
    const result = await createUser({
      user_id: newUserId.trim(),
      name: newName.trim(),
      role: newRole,
      password: newPassword.trim(),
    });

    if (!result.success) {
      setFormError(result.error || 'Failed to create user');
      setCreating(false);
      return;
    }

    setNewUserId('');
    setNewName('');
    setNewRole('ANNOTATOR');
    setNewPassword('');
    setShowModal(false);
    await loadUsers();
    setCreating(false);
  }

  async function handleToggleActive(user: User) {
    await setUserActive(user.id, !user.active);
    await loadUsers();
  }

  async function handleDelete(user: User) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${user.name}" (${user.user_id})? This cannot be undone and will also delete all their evaluations.`
    );
    if (!confirmed) return;
    await deleteUser(user.id);
    await loadUsers();
  }

  const activeCount = users.filter(u => u.active).length;
  const translators = users.filter(u => u.role === 'TRANSLATOR').length;
  const annotators = users.filter(u => u.role === 'ANNOTATOR').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          </div>
          <button
            onClick={() => { setShowModal(true); setFormError(''); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Create User
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Active</p>
            <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Translators</p>
            <p className="text-3xl font-bold text-blue-600">{translators}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Annotators</p>
            <p className="text-3xl font-bold text-green-600">{annotators}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['User ID', 'Name', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id} className={!user.active ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                      {user.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`font-medium mr-4 ${user.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {user.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="font-medium text-gray-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Progress Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">User Progress</h2>
            <p className="text-sm text-gray-500 mt-0.5">How many prompts each user has evaluated</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {progress.filter(u => u.role !== 'ADMIN').map(user => {
                const isTranslator = user.role === 'TRANSLATOR';
                const count = isTranslator ? user.translated : user.annotated;
                const total = isTranslator ? user.totalTranslations : user.totalAnnotations;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const isComplete = count === total && total > 0;

                return (
                  <div key={user.id} className={`px-6 py-4 ${!user.active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                          <span className="ml-2 text-xs font-mono text-gray-400">{user.user_id}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[user.role]}`}>
                          {user.role}
                        </span>
                        {!user.active && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isComplete && (
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : 'text-gray-700'}`}>
                          {count}/{total}
                        </span>
                        <span className="text-xs text-gray-400">({pct}%)</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {progress.filter(u => u.role !== 'ADMIN').length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  No translators or annotators found.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New User</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={e => setNewUserId(e.target.value)}
                  placeholder="e.g. TN-02"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Juan dela Cruz"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="ANNOTATOR">Annotator</option>
                  <option value="TRANSLATOR">Translator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="e.g. Trans@24"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Share this password with the user after creating their account.</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                Make sure to note down the password — it won't be shown again after creation.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
