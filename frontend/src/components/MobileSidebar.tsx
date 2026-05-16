import type { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ICON_SIZE } from '../lib/icon-size';

interface MobileHeaderProps {
  header: ReactNode;
  onOpen: () => void;
  headerClassName?: string;
  menuButtonClassName?: string;
}

export function MobileHeader({
  header,
  onOpen,
  headerClassName,
  menuButtonClassName,
}: MobileHeaderProps) {
  return (
    <div
      className={cn(
        'md:hidden flex items-center justify-between px-4 py-3',
        headerClassName,
      )}
    >
      {header}
      <button
        onClick={onOpen}
        aria-label="メニューを開く"
        title="メニューを開く"
        className={cn('p-1.5 rounded-md', menuButtonClassName)}
      >
        <Menu size={ICON_SIZE.xl} />
      </button>
    </div>
  );
}

export function SidebarOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 md:hidden"
      onClick={onClose}
    />
  );
}

interface SidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarHeader: ReactNode;
  children: ReactNode;
  sidebarClassName?: string;
  sidebarHeaderClassName?: string;
  closeButtonClassName?: string;
}

export function SidebarPanel({
  isOpen,
  onClose,
  sidebarHeader,
  children,
  sidebarClassName,
  sidebarHeaderClassName,
  closeButtonClassName,
}: SidebarPanelProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        sidebarClassName,
      )}
    >
      <div
        className={cn(
          'px-5 py-4 border-b flex items-center justify-between',
          sidebarHeaderClassName,
        )}
      >
        {sidebarHeader}
        <button
          onClick={onClose}
          aria-label="メニューを閉じる"
          title="メニューを閉じる"
          className={cn('md:hidden p-1 rounded-md', closeButtonClassName)}
        >
          <X size={ICON_SIZE.xl} />
        </button>
      </div>
      {children}
    </aside>
  );
}
