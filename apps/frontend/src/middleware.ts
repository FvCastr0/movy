import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('movy_token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login');
  const isProtectedPath =
    pathname.startsWith('/leads') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/crm') ||
    pathname.startsWith('/finance') ||
    pathname.startsWith('/dashboard') ||
    pathname === '/';

  // Se tentar acessar rota protegida sem token, redireciona para login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se já estiver logado e tentar acessar login, redireciona para a raiz (Dashboard Geral)
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/leads/:path*',
    '/clients/:path*',
    '/crm/:path*',
    '/finance/:path*',
    '/dashboard/:path*',
  ],
};
