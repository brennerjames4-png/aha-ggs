import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isOnboarded = req.auth?.user?.onboarded;

  // Public paths — always accessible
  const isPublicPath =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/users/search';

  if (isPublicPath) {
    // If logged in and on login page, redirect to dashboard or onboarding
    if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
      const dest = isOnboarded ? '/' : '/onboarding';
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // Not logged in → redirect to login
  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Logged in but not onboarded → only allow onboarding, claim, and API routes
  if (!isOnboarded) {
    const allowedPaths = ['/onboarding', '/claim'];
    const isAllowed =
      allowedPaths.some(p => pathname.startsWith(p)) ||
      pathname.startsWith('/api/');

    if (!isAllowed) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
