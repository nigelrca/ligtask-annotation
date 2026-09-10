'use server';

import { cookies } from 'next/headers';
import { login as authLogin, getRoleHomePage } from '@/lib/auth';

export async function login(userId: string, password: string) {
  const { user, error } = await authLogin(userId, password);

  if (error || !user) {
    return { success: false, error: error || 'Login failed' };
  }

  // Set session cookies
  const cookieStore = await cookies();
  
  // Set cookies that expire in 24 hours
  const oneDay = 24 * 60 * 60 * 1000;
  const expires = new Date(Date.now() + oneDay);

  cookieStore.set('user_id', user.user_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    sameSite: 'lax',
    path: '/',
  });

  cookieStore.set('user_role', user.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    sameSite: 'lax',
    path: '/',
  });

  cookieStore.set('user_name', user.name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    sameSite: 'lax',
    path: '/',
  });

  return {
    success: true,
    redirectTo: getRoleHomePage(user.role),
  };
}

export async function logout() {
  const cookieStore = await cookies();
  
  cookieStore.delete('user_id');
  cookieStore.delete('user_role');
  cookieStore.delete('user_name');

  return { success: true };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;
  const userName = cookieStore.get('user_name')?.value;

  if (!userId || !userRole || !userName) {
    return null;
  }

  return {
    user_id: userId,
    role: userRole,
    name: userName,
  };
}
