import { BuildingsIcon, CheckIcon, ChevronDownIcon } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateWorkspaceDialog } from '@/features/workspace/components/CreateWorkspaceDialog';
import { getInitials } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

export function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-bg px-3 text-left transition-colors duration-fast hover:border-border-strong">
        <Avatar className="h-6 w-6 rounded-md bg-accent-subtle">
          <AvatarFallback className="rounded-md bg-accent-subtle text-xs text-accent">
            {currentWorkspace ? getInitials(currentWorkspace.name) : <BuildingsIcon size={14} weight="regular" />}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
          {currentWorkspace?.name ?? 'Select workspace'}
        </span>
        <ChevronDownIcon size={16} weight="regular" className="shrink-0 text-fg-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[216px]">
        {workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} onSelect={() => setCurrentWorkspace(workspace.id)}>
            <Avatar className="h-6 w-6 rounded-md">
              <AvatarFallback className="rounded-md bg-accent-subtle text-xs text-accent">{getInitials(workspace.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            {workspace.id === currentWorkspaceId ? <CheckIcon size={16} weight="bold" className="text-accent" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-1 py-1">
          <CreateWorkspaceDialog />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
