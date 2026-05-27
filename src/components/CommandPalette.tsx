import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  Home, Package, Calendar, Moon, Sun, MessageSquare,
  FileText, Plus, LogOut, Clock, Search, QrCode, LayoutGrid, CheckSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRecentItems } from '@/hooks/useRecentItems';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import styles from '@/styles/CommandPalette.module.css';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action?: () => void;
  href?: string;
}

interface CommandGroup {
  id: string;
  title: string;
  items: CommandItem[];
}

export function CommandPalette() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { recentItems, addItem } = useRecentItems();
  const { toast } = useToast();

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const isTyping = document.activeElement?.tagName === "INPUT" ||
                       document.activeElement?.tagName === "TEXTAREA";

      if (e.key === 'k' && isMeta) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      if (open || isTyping) return;

      if (e.key === 'i' && isMeta) {
        e.preventDefault();
        navigate('/inventory');
        addItem({ id: 'go-inventory', title: t('command.nav.inventory_title'), category: t('command.groups.navigation'), path: '/inventory' });
      }
      if (e.key === 'e' && isMeta) {
        e.preventDefault();
        navigate('/projects');
        addItem({ id: 'go-projects', title: t('command.nav.projects_title'), category: t('command.groups.navigation'), path: '/projects' });
      }
      if (e.key === 'f' && isMeta) { e.preventDefault(); setOpen(true); }
      if (e.key === 'n' && isMeta) {
        e.preventDefault();
        navigate('/inventory');
        addItem({ id: 'new-item', title: t('command.actions.new_item_title'), category: t('command.groups.actions') });
      }
      if (e.key === 'Q' && isMeta && e.shiftKey) { e.preventDefault(); signOut(); }
      if (e.key === 's' && isMeta) { e.preventDefault(); navigate('/scanner'); }
      if (e.key === '/') { e.preventDefault(); setOpen(true); }
      if (e.key === 'n' && !isMeta) {
        e.preventDefault();
        navigate('/inventory');
        addItem({ id: 'new-item', title: t('command.actions.new_item_title'), category: t('command.groups.actions') });
      }
      if (e.key === '+') {
        e.preventDefault();
        navigate('/inventory');
        addItem({ id: 'new-item', title: t('command.actions.new_item_title'), category: t('command.groups.actions') });
      }
      if (e.key === 's') { e.preventDefault(); navigate('/scanner'); }
      if (e.key === 'v') { e.preventDefault(); navigate('/inventory'); }
      if (e.key === 'm') { e.preventDefault(); navigate('/inventory'); }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, navigate, addItem, signOut, t]);

  const handleNavigation = (href: string, title: string, id: string) => {
    navigate(href);
    addItem({ id, title, category: t('command.groups.navigation'), path: href });
    setOpen(false);
  };

  const handleAction = (action: () => void, title: string) => {
    action();
    addItem({ id: title.toLowerCase().replace(/\s/g, '-'), title, category: t('command.groups.actions') });
    setOpen(false);
  };

  const groups: CommandGroup[] = [
    {
      id: 'navigation',
      title: t('command.groups.navigation'),
      items: [
        {
          id: 'go-inventory',
          title: t('command.nav.inventory_title'),
          description: t('command.nav.inventory_desc'),
          icon: <Package className="h-4 w-4" />,
          shortcut: '⌘ I',
          href: '/inventory',
        },
        {
          id: 'go-projects',
          title: t('command.nav.projects_title'),
          description: t('command.nav.projects_desc'),
          icon: <Calendar className="h-4 w-4" />,
          shortcut: '⌘ E',
          href: '/projects',
        },
        {
          id: 'go-lending',
          title: t('command.nav.lending_title'),
          description: t('command.nav.lending_desc'),
          icon: <Clock className="h-4 w-4" />,
          href: '/lending',
        },
        {
          id: 'go-profile',
          title: t('command.nav.profile_title'),
          description: t('command.nav.profile_desc'),
          icon: <Home className="h-4 w-4" />,
          href: '/settings',
        },
      ],
    },
    {
      id: 'actions',
      title: t('command.groups.actions'),
      items: [
        {
          id: 'new-item',
          title: t('command.actions.new_item_title'),
          description: t('command.actions.new_item_desc'),
          icon: <Plus className="h-4 w-4" />,
          shortcut: '⌘ N / n / +',
          action: () => { navigate('/inventory'); },
        },
        {
          id: 'search-inventory',
          title: t('command.actions.search_title'),
          description: t('command.actions.search_desc'),
          icon: <Search className="h-4 w-4" />,
          shortcut: '⌘ F / /',
          action: () => { navigate('/inventory'); setOpen(true); },
        },
        {
          id: 'qr-scanner',
          title: t('command.actions.qr_title'),
          description: t('command.actions.qr_desc'),
          icon: <QrCode className="h-4 w-4" />,
          shortcut: '⌘ S',
          action: () => {
            navigate('/scanner');
            addItem({ id: 'qr-scanner', title: t('command.actions.qr_title'), category: t('command.groups.actions') });
            setOpen(false);
          },
        },
        {
          id: 'toggle-view',
          title: t('command.actions.toggle_view_title'),
          description: t('command.actions.toggle_view_desc'),
          icon: <LayoutGrid className="h-4 w-4" />,
          shortcut: 'v',
          action: () => {
            navigate('/inventory?action=toggle-view');
            addItem({ id: 'toggle-view', title: t('command.actions.toggle_view_title'), category: t('command.groups.actions') });
            setOpen(false);
          },
        },
        {
          id: 'selection-mode',
          title: t('command.actions.selection_title'),
          description: t('command.actions.selection_desc'),
          icon: <CheckSquare className="h-4 w-4" />,
          shortcut: 'm',
          action: () => {
            navigate('/inventory?action=toggle-selection');
            addItem({ id: 'selection-mode', title: t('command.actions.selection_title'), category: t('command.groups.actions') });
            setOpen(false);
          },
        },
      ],
    },
    {
      id: 'appearance',
      title: t('command.groups.appearance'),
      items: [
        {
          id: 'toggle-theme',
          title: isDarkMode ? t('command.appearance.light_mode') : t('command.appearance.dark_mode'),
          description: isDarkMode ? t('command.appearance.switch_to_light') : t('command.appearance.switch_to_dark'),
          icon: isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
          action: () => {
            const root = document.documentElement;
            const newTheme = isDarkMode ? 'hell' : 'dunkel';
            localStorage.setItem('rigflow:theme', newTheme);
            if (newTheme === 'dunkel') { root.classList.add('dark'); } else { root.classList.remove('dark'); }
            setIsDarkMode(!isDarkMode);
            toast({ title: isDarkMode ? t('command.appearance.light_activated') : t('command.appearance.dark_activated') });
          },
        },
      ],
    },
    {
      id: 'support',
      title: t('command.groups.support'),
      items: [
        {
          id: 'help',
          title: t('command.support.docs_title'),
          description: t('command.support.docs_desc'),
          icon: <FileText className="h-4 w-4" />,
          action: () => { window.open('/help', '_blank'); },
        },
        {
          id: 'feedback',
          title: t('command.support.feedback_title'),
          description: t('command.support.feedback_desc'),
          icon: <MessageSquare className="h-4 w-4" />,
          action: () => { window.location.href = 'mailto:?subject=Feedback - RigFlow'; },
        },
      ],
    },
    {
      id: 'account',
      title: t('command.groups.account'),
      items: [
        {
          id: 'logout',
          title: t('auth.logout'),
          description: t('command.account.logout_desc', { email: user?.email }),
          icon: <LogOut className="h-4 w-4" />,
          shortcut: '⌘ ⇧ Q',
          action: () => { signOut(); setOpen(false); },
        },
      ],
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className={`${styles.commandPaletteContent} ${styles.commandPalette}`}>
        <CommandInput
          placeholder={t('command.placeholder')}
          className="placeholder-muted-foreground/60"
        />

        <CommandList className="max-h-[400px]">
          {recentItems.length > 0 && (
            <>
              <CommandGroup heading={t('command.recent')} className="overflow-hidden">
                {recentItems.map((item) => (
                  <CommandItem
                    key={`recent-${item.id}`}
                    value={`${item.title} ${item.category}`}
                    onSelect={() => { if (item.path) { navigate(item.path); setOpen(false); } }}
                    className="cursor-pointer"
                  >
                    <Clock className="mr-2 h-4 w-4 opacity-60" />
                    <span>{item.title}</span>
                    <span className="ml-auto text-xs opacity-50">{item.category}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groups.map((group) => (
            <div key={group.id}>
              <CommandGroup heading={group.title}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.description || ''}`}
                    onSelect={() => {
                      if (item.href) { handleNavigation(item.href, item.title, item.id); }
                      else if (item.action) { handleAction(item.action, item.title); }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="mr-2 h-4 w-4 flex items-center justify-center">{item.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <span className="ml-auto text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                        {item.shortcut}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}

          <CommandEmpty>
            <div className="py-6 text-center text-sm">
              <p className="text-muted-foreground mb-2">{t('command.empty')}</p>
              <a href="/help" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                {t('command.docs_link')}
              </a>
            </div>
          </CommandEmpty>
        </CommandList>

        <div className="border-t border-border/50 px-2 py-2 text-xs text-muted-foreground text-center">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground opacity-100">
            <span className="text-xs">ESC</span>
          </kbd>
          <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground opacity-100">
            <span className="text-xs">⌘K</span>
          </kbd>
          {' '}{t('command.close_hint')}
        </div>
      </div>
    </CommandDialog>
  );
}