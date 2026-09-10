'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(userId, password);
      
      if (!result.success) {
        setError(result.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Redirect based on user role
      router.push(result.redirectTo || '/');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-6xl flex flex-col md:flex-row shadow-2xl rounded-2xl overflow-hidden">
        {/* Left Panel - Branding (hidden on small screens) */}
        <div
          className="hidden md:flex md:w-1/2 relative overflow-hidden flex-col justify-center p-10 lg:p-12 text-white min-h-[480px]"
          style={{
            backgroundImage: 'url(/logingradient.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'bottom center',
          }}
        >
          <h1 className="text-6xl lg:text-8xl font-bold mb-4 lg:mb-6 tracking-tighter">LIGTASK</h1>
          <p className="text-base lg:text-lg text-white/90 leading-tight tracking-tight">
            A platform for linguistic verification and contextual safety evaluation of English and Filipino prompts.
          </p>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full md:w-1/2 bg-white p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          {/* Mobile-only logo */}
          <div className="md:hidden mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter" style={{ color: '#1C45D5' }}>LIGTASK</h1>
            <p className="text-sm text-gray-500 mt-1">Annotation Platform</p>
          </div>

          <div className="max-w-md mx-auto w-full">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-gray-900">Login</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="userId" className="block text-sm font-bold text-gray-900 mb-2">
                  USER ID
                </label>
                <input
                  id="userId"
                  name="userId"
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder=""
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg"
              >
                {loading ? 'Signing in...' : 'Continue'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600 tracking-tight">
              Get your{' '}
              <span className="text-blue-600 font-medium">login credentials</span>
              {' '}from the admins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
