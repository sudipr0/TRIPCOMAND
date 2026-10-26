import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLogout, useSession } from '@/features/auth/hooks/useAuth';
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspaces';
import { useAuthStore } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';

/**
 * Field layout: no sidebar, no dashboards — just the guide's assigned trips.
 * A single column capped at phone width so it reads well on a small screen and
 * still looks deliberate on a laptop.
 */
export function FieldLayout() {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore();
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const { isPending: sessionPending, isError: sessionError } = useSession();
  const { isLoading: workspacesLoading } = useWorkspaces(isAuthenticated);
  const logout = useLogout();

  if (isLoading || sessionPending || workspacesLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-fg-muted">Loading field tools...</div>;
  }
  if (!isAuthenticated || sessionError) return <Navigate to="/login" replace />;
  if (!currentWorkspaceId) return <Navigate to="/workspaces/new" replace />;

  return (
    <div className="min-h-screen bg-bg-subtle">
      <header className="sticky top-0 z-30 border-b border-border bg-bg">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-4">
          <Link to="/field" className="flex items-center gap-2 text-base font-semibold tracking-tight text-fg">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs text-accent-fg">T</span>
            Field
          </Link>
          <nav className="flex items-center gap-1" aria-label="Field navigation">
            <Link
              to="/field"
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast',
                pathname === '/field' ? 'bg-accent-subtle text-accent' : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
              )}
            >
              Trips
            </Link>
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors duration-fast hover:bg-bg-muted hover:text-fg"
            >
              Office
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={() => logout.mutate()}>
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="page-enter mx-auto w-full max-w-xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
