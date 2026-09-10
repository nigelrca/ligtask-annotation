import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session from cookie (we'll set this after login)
  const userRole = request.cookies.get('user_role')?.value;
  const userId = request.cookies.get('user_id')?.value;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login'];
  if (publicRoutes.includes(pathname)) {
    // If already logged in, redirect to appropriate page
    if (userRole) {
      return NextResponse.redirect(new URL(getRoleHomePage(userRole), request.url));
    }
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!userId || !userRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based access control
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL(getRoleHomePage(userRole), request.url));
    }
  }

  if (pathname.startsWith('/translate')) {
    if (userRole !== 'TRANSLATOR') {
      return NextResponse.redirect(new URL(getRoleHomePage(userRole), request.url));
    }
  }

  if (pathname.startsWith('/annotate')) {
    if (userRole !== 'ANNOTATOR') {
      return NextResponse.redirect(new URL(getRoleHomePage(userRole), request.url));
    }
  }

  return NextResponse.next();
}

function getRoleHomePage(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'TRANSLATOR':
      return '/translate';
    case 'ANNOTATOR':
      return '/annotate';
    default:
      return '/login';
  }
}

// Configure which routes should trigger middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, svgs, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.svg).*)',
  ],
};
