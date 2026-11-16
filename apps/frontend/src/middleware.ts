import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('movy_token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login');
  const isProtectedPath = pathname.startsWith('/leads') || pathname.startsWith('/dashboard') || pathname === '/';

  // Se tentar acessar rota protegida sem token, redireciona para login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se já estiver logado e tentar acessar login, redireciona para o funil
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/leads', request.url));
  }

  // Se acessar raiz '/', manda para /leads se logado
  if (pathname === '/' && token) {
    return NextResponse.redirect(new URL('/leads', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/leads/:path*', '/dashboard/:path*'],
};
