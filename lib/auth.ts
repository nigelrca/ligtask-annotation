import { supabase } from './supabase';
import { User, UserRole } from '@/types/database';

export interface AuthUser {
  id: string;
  user_id: string;
  name: string;
  role: UserRole;
}

/**
 * Authenticate user with user_id and password.
 * Password is stored in plain text in the users table (prototype).
 * For production, use bcrypt hashing.
 */
export async function login(userId: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (userError || !userData) {
      return { user: null, error: 'Invalid user ID or password' };
    }

    if (!userData.password || userData.password !== password) {
      return { user: null, error: 'Invalid user ID or password' };
    }

    return {
      user: {
        id: userData.id,
        user_id: userData.user_id,
        name: userData.name,
        role: userData.role,
      },
      error: null,
    };
  } catch (error) {
    console.error('Login error:', error);
    return { user: null, error: 'An error occurred during login' };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as User;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Get role home page
 */
export function getRoleHomePage(role: UserRole): string {
  switch (role) {
    case 'ADMIN':      return '/admin';
    case 'TRANSLATOR': return '/translate';
    case 'ANNOTATOR':  return '/annotate';
    default:           return '/login';
  }
}
