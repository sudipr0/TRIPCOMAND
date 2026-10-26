import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';

import {
  BookingIcon,
  ChevronDownIcon,
  CloseIcon,
  CustomerIcon,
  DashboardIcon,
  DestinationIcon,
  InquiryIcon,
  LogoutIcon,
  QuotationIcon,
  SettingsIcon,
  StaffIcon,
  SupplierIcon,
  TemplateIcon,
  TripIcon,
  TruckIcon,
  CalendarIcon,
  WarningIcon,
  MoneyIcon,
} from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { WorkspaceSwitcher } from '@/features/workspace/components/WorkspaceSwitcher';
import { useLogout, useSession } from '@/features/auth/hooks/useAuth';
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspaces';
import { getInitials } from '@/lib/utils';
import { useAuthStore, isGuideRole } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  { label: 'Operations', items: [{ label: 'Dashboard', path: '/dashboard', icon: DashboardIcon }, { label: 'Trips', path: '/trips', icon: TripIcon }, { label: 'Disruptions', path: '/disruptions', icon: WarningIcon }, { label: 'Itinerary', path: '/trips', icon: TripIcon }] },
  { label: 'Commercial', items: [{ label: 'Customers', path: '/customers', icon: CustomerIcon }, { label: 'Inquiries', path: '/inquiries', icon: InquiryIcon }, { label: 'Quotations', path: '/quotations', icon: QuotationIcon }, { label: 'Bookings', path: '/bookings', icon: BookingIcon }, { label: 'Finance', path: '/finance', icon: MoneyIcon }] },
  { label: 'Catalog', items: [{ label: 'Destinations', path: '/destinations', icon: DestinationIcon }, { label: 'Trek Templates', path: '/trek-templates', icon: TemplateIcon }] },
  { label: 'Resources', items: [{ label: 'Staff', path: '/staff', icon: StaffIcon }, { label: 'Resources', path: '/resources', icon: TruckIcon }, { label: 'Availability', path: '/availability', icon: CalendarIcon }, { label: 'Suppliers', path: '/suppliers', icon: SupplierIcon }] },
  { label: 'Settings', items: [{ label: 'Settings', path: '/settings', icon: SettingsIcon }] },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/staff': 'Staff',
  '/destinations': 'Destinations',
  '/trek-templates': 'Trek Templates',
  '/customers': 'Customers',
  '/inquiries': 'Inquiries',
  '/quotations': 'Quotations',
  '/bookings': 'Bookings',
  '/finance': 'Finance',
  '/trips': 'Trips',
  '/disruptions': 'Disruptions',
  '/resources': 'Resources',
  '/availability': 'Availability',
  '/suppliers': 'Suppliers',
  '/settings': 'Settings',
};

function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const name = user ? `${user.firstName} ${user.lastName}` : 'Account';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={compact ? 'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors duration-fast hover:bg-bg-muted' : 'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-fast hover:bg-bg-muted'}>
        <Avatar className={compact ? 'h-7 w-7' : 'h-8 w-8'}>
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{name}</span>
          {compact ? <span className="block truncate text-xs text-fg-subtle">{user?.email ?? ''}</span> : null}
        </span>
        <ChevronDownIcon size={16} weight="regular" className="shrink-0 text-fg-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? 'start' : 'end'} className="w-52">
        <DropdownMenuItem asChild><Link to="/settings">Profile</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => logout.mutate()}>
          <LogoutIcon size={16} weight="regular" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation();
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-bg-subtle p-3">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 px-1 py-2 text-lg font-semibold tracking-tight text-fg">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs text-accent-fg">T</span>
          TrailComand
        </Link>
        {onClose ? <Button variant="ghost" size="sm" className="h-8 w-8 px-0 lg:hidden" onClick={onClose}><CloseIcon size={16} /></Button> : null}
      </div>
      <div className="mt-3"><WorkspaceSwitcher /></div>
      <Separator className="my-3" />
      <nav className="min-h-0 flex-1 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="mb-2 ml-3 text-xs font-medium uppercase tracking-[0.05em] text-fg-subtle">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                 const active = pathname === item.path || (item.path !== '/trips' && pathname.startsWith(`${item.path}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={`${group.label}-${item.label}`}
                    to={item.path}
                    onClick={onClose}
                    className={active ? 'flex h-9 items-center gap-2.5 rounded-md bg-accent-subtle px-3 text-sm font-medium text-accent transition-colors duration-fast' : 'flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium text-fg-muted transition-colors duration-fast hover:bg-bg-muted hover:text-fg'}
                  >
                    <Icon size={18} weight={active ? 'bold' : 'regular'} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <Separator className="my-3" />
      <UserMenu compact />
    </aside>
  );
}

export function WorkspaceLayout() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore();
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const { isPending: sessionPending, isError: sessionError } = useSession();
  const { isLoading: workspacesLoading } = useWorkspaces(isAuthenticated);
  const workspaceRole = useWorkspaceStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.currentWorkspaceId)?.role.name,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading || sessionPending || workspacesLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-fg-muted">Loading workspace...</div>;
  }
  if (!isAuthenticated || sessionError) return <Navigate to="/login" replace />;
  if (!currentWorkspaceId) return <Navigate to="/workspaces/new" replace />;
  // A guide's home is the field app, not the office workspace.
  if (isGuideRole(workspaceRole)) return <Navigate to="/field" replace />;

   const title = pageTitles[location.pathname] ?? Object.entries(pageTitles).find(([path]) => location.pathname.startsWith(`${path}/`))?.[1] ?? 'Workspace';
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="hidden shrink-0 lg:block"><Sidebar /></div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-[hsl(30_10%_10%_/_0.4)]" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-60"><Sidebar onClose={() => setMobileOpen(false)} /></div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-bg px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 px-0 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <span className="flex flex-col gap-1"><span className="h-px w-4 bg-current" /><span className="h-px w-4 bg-current" /><span className="h-px w-4 bg-current" /></span>
            </Button>
            <span className="text-base font-medium text-fg">{title}</span>
          </div>
          <div className="hidden sm:block"><UserMenu /></div>
        </header>
        <main className="page-enter flex-1 px-6 py-8 lg:px-10 lg:py-8"><Outlet /></main>
      </div>
    </div>
  );
}
