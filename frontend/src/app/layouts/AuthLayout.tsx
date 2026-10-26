import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useSession } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';

const routeCopy: Record<string, { title: string; subtitle: string }> = {
  '/login': { title: 'Sign in', subtitle: 'Access your agency workspace.' },
  '/register': { title: 'Create your account', subtitle: 'Start organizing the work behind every trip.' },
  '/forgot-password': { title: 'Reset your password', subtitle: 'We’ll help you get back into your account.' },
  '/reset-password': { title: 'Choose a new password', subtitle: 'Use a password you’ll remember and only you know.' },
};

export function AuthLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const shouldProbeSession = pathname === '/login';
  const session = useSession(shouldProbeSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const copy = routeCopy[pathname] ?? routeCopy['/login'];

  useEffect(() => {
    if (shouldProbeSession && isAuthenticated && !session.isPending) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, session.isPending, shouldProbeSession]);

  if (shouldProbeSession && isAuthenticated && !session.isPending) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-bg lg:grid lg:grid-cols-[3fr_2fr]">
      <section className="hidden min-h-screen bg-bg-subtle px-10 py-10 lg:flex lg:flex-col">
        <Link to="/login" className="inline-flex w-fit items-center gap-2 text-lg font-semibold tracking-tight text-fg">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm text-accent-fg">T</span>
          TrailComand
        </Link>
        <div className="mt-auto max-w-md pb-16">
          <div className="mb-6 h-px w-16 bg-accent" />
          <p className="text-2xl font-medium leading-8 tracking-tight text-fg">Operational intelligence for trekking agencies.</p>
          <p className="mt-4 text-md text-fg-muted">Keep every customer, itinerary, and supplier detail moving in the same direction.</p>
        </div>
      </section>
      <section className="flex min-h-screen flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Link to="/login" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-fg">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm text-accent-fg">T</span>
              TrailComand
            </Link>
          </div>
          <div className="mb-5">
            <h1 className="text-3xl font-semibold tracking-tight text-fg">{copy.title}</h1>
            <p className="mt-2 text-md text-fg-muted">{copy.subtitle}</p>
          </div>
          <div className="rounded-lg border border-border bg-bg p-8 shadow-xs">
            <Outlet />
          </div>
          <div className="mt-5 text-center text-sm text-fg-muted">
            {pathname === '/login' ? (
              <>New to TrailComand? <Link to="/register" className="font-medium text-accent hover:text-accent-hover hover:underline">Create an account</Link></>
            ) : pathname === '/register' ? (
              <>Already have an account? <Link to="/login" className="font-medium text-accent hover:text-accent-hover hover:underline">Sign in</Link></>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
