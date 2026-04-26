import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Home,
  Package,
  Calendar,
  Moon,
  Sun,
  MessageSquare,
  FileText,
  Plus,
  LogOut,
  Clock,
  Search,
  QrCode,
  LayoutGrid,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRecentItems } from '@/hooks/useRecentItems';
import { useToast } from '@/hooks/use-toast';
import styles from './CommandPalette.module.css';

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
  const [open, setOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { recentItems, addItem } = useRecentItems();
  const { toast } = useToast();

  // Listen to dark mode changes
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

  // Keyboard Listener für Shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const isTyping = document.activeElement?.tagName === "INPUT" || 
                       document.activeElement?.tagName === "TEXTAREA";

      // ⌘/Ctrl + K: Toggle Command Palette
      if (e.key === 'k' && isMeta) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      // Nur wenn die Palette geschlossen ist und man nicht in einem Input-Feld tippt
      if (open || isTyping) return;

      // ⌘/Ctrl + I: Go to Inventory
      if (e.key === 'i' && isMeta) {
        e.preventDefault();
        navigate('/inventory');
        addItem({
          id: 'go-inventory',
          title: 'Zum Inventar',
          category: 'Navigation',
          path: '/inventory',
        });
      }

      // ⌘/Ctrl + E: Go to Events
      if (e.key === 'e' && isMeta) {
        e.preventDefault();
        navigate('/projects');
        addItem({
          id: 'go-projects',
          title: 'Zu den Projekten',
          category: 'Navigation',
          path: '/projects',
        });
      }

      // ⌘/Ctrl + F: Focus on Search (opens palette)
      if (e.key === 'f' && isMeta) {
        e.preventDefault();
        setOpen(true);
      }

      // ⌘/Ctrl + N: New Item
      if (e.key === 'n' && isMeta) {
        e.preventDefault();
        navigate('/inventory');
        addItem({
          id: 'new-item',
          title: 'Neues Item erstellen',
          category: 'Aktionen',
        });
      }

      // ⌘/Ctrl + Shift + Q: Logout
      if (e.key === 'Q' && isMeta && e.shiftKey) {
        e.preventDefault();
        signOut();
      }

      // ⌘/Ctrl + S: Open QR Scanner
      if (e.key === 's' && isMeta) {
        e.preventDefault();
        navigate('/scanner');
      }

      // --- Einfache Tasten (nur wenn NICHT in Input und NICHT beim Tippen) ---

      // / - Focus Search (opens palette)
      if (e.key === '/') {
        e.preventDefault();
        setOpen(true);
      }

      // n - New Item
      if (e.key === 'n' && !isMeta) {
        e.preventDefault();
        navigate('/inventory');
        addItem({
          id: 'new-item',
          title: 'Neues Item erstellen',
          category: 'Aktionen',
        });
      }

      // + - New Item (alternative)
      if (e.key === '+') {
        e.preventDefault();
        navigate('/inventory');
        addItem({
          id: 'new-item',
          title: 'Neues Item erstellen',
          category: 'Aktionen',
        });
      }

      // s - Open QR Scanner (navigates to scanner)
      if (e.key === 's') {
        e.preventDefault();
        navigate('/scanner');
      }

      // v - Toggle View (navigates to inventory)
      if (e.key === 'v') {
        e.preventDefault();
        navigate('/inventory');
      }

      // m - Selection Mode (navigates to inventory)
      if (e.key === 'm') {
        e.preventDefault();
        navigate('/inventory');
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, navigate, addItem, signOut]);

  const handleNavigation = (href: string, title: string, id: string) => {
    navigate(href);
    // Recent Item hinzufügen
    addItem({
      id,
      title,
      category: 'Navigation',
      path: href,
    });
    setOpen(false);
  };

  const handleAction = (action: () => void, title: string) => {
    action();
    addItem({
      id: title.toLowerCase().replace(/\s/g, '-'),
      title,
      category: 'Aktionen',
    });
    setOpen(false);
  };

  const groups: CommandGroup[] = [
    {
      id: 'navigation',
      title: 'Navigation',
      items: [
        {
          id: 'go-inventory',
          title: 'Zum Inventar',
          description: 'Alle deine Gegenstände verwalten',
          icon: <Package className="h-4 w-4" />,
          shortcut: '⌘ I',
          href: '/inventory',
        },
        {
          id: 'go-projects',
          title: 'Zu den Projekten',
          description: 'Projekt-Management und Event-Planung',
          icon: <Calendar className="h-4 w-4" />,
          shortcut: '⌘ E',
          href: '/projects',
        },
        {
          id: 'go-lending',
          title: 'Ausleih-Geschichte',
          description: 'Leih- und Rückgabeverlauf',
          icon: <Clock className="h-4 w-4" />,
          href: '/lending',
        },
        {
          id: 'go-profile',
          title: 'Profil',
          description: 'Kontoinformationen & Einstellungen',
          icon: <Home className="h-4 w-4" />,
          href: '/settings',
        },
      ],
    },
    {
      id: 'actions',
      title: 'Aktionen',
      items: [
        {
          id: 'new-item',
          title: 'Neues Item erstellen',
          description: 'Ein neues Inventar-Item hinzufügen',
          icon: <Plus className="h-4 w-4" />,
          shortcut: '⌘ N / n / +',
          action: () => {
            navigate('/inventory');
          },
        },
        {
          id: 'search-inventory',
          title: 'Inventar durchsuchen',
          description: 'Nach Items suchen',
          icon: <Search className="h-4 w-4" />,
          shortcut: '⌘ F / /',
          action: () => {
            navigate('/inventory');
            setOpen(true);
          },
        },
        {
          id: 'qr-scanner',
          title: 'QR Scanner öffnen',
          description: 'Items per QR-Code scannen',
          icon: <QrCode className="h-4 w-4" />,
          shortcut: '⌘ S',
          action: () => {
            navigate('/scanner');
            addItem({
              id: 'qr-scanner',
              title: 'QR Scanner öffnen',
              category: 'Aktionen',
            });
            setOpen(false);
          },
        },
        {
          id: 'toggle-view',
          title: 'Ansicht umschalten',
          description: 'Zwischen Kacheln- und Listenansicht wechseln',
          icon: <LayoutGrid className="h-4 w-4" />,
          shortcut: 'v',
          action: () => {
            navigate('/inventory?action=toggle-view');
            addItem({
              id: 'toggle-view',
              title: 'Ansicht umschalten',
              category: 'Aktionen',
            });
            setOpen(false);
          },
        },
        {
          id: 'selection-mode',
          title: 'Mehrfachauswahl',
          description: 'Mehrere Items gleichzeitig auswählen',
          icon: <CheckSquare className="h-4 w-4" />,
          shortcut: 'm',
          action: () => {
            navigate('/inventory?action=toggle-selection');
            addItem({
              id: 'selection-mode',
              title: 'Mehrfachauswahl',
              category: 'Aktionen',
            });
            setOpen(false);
          },
        },
      ],
    },
    {
      id: 'appearance',
      title: 'Design',
      items: [
        {
          id: 'toggle-theme',
          title: isDarkMode ? 'Hell-Modus' : 'Dunkel-Modus',
          description: `Schalte auf ${isDarkMode ? 'Hellmodus' : 'Dunkelmodus'} um`,
          icon:
            isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            ),
          action: () => {
            const root = document.documentElement;
            const newTheme = isDarkMode ? 'hell' : 'dunkel';
            localStorage.setItem('rigflow:theme', newTheme);
            if (newTheme === 'dunkel') {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
            setIsDarkMode(!isDarkMode);
            toast({
              title: `${isDarkMode ? 'Hellmodus' : 'Dunkelmodus'} aktiviert`,
            });
          },
        },
      ],
    },
    {
      id: 'support',
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Dokumentation',
          description: 'Anleitung & Hilfe lesen',
          icon: <FileText className="h-4 w-4" />,
          action: () => {
            window.open('/help', '_blank');
          },
        },
        {
          id: 'feedback',
          title: 'Feedback senden',
          description: 'Fehler melden oder Features vorschlagen',
          icon: <MessageSquare className="h-4 w-4" />,
          action: () => {
            window.location.href =
              'mailto:?subject=Feedback - RigFlow';
          },
        },
      ],
    },
    {
      id: 'account',
      title: 'Konto',
      items: [
        {
          id: 'logout',
          title: 'Abmelden',
          description: `Abmelden als ${user?.email}`,
          icon: <LogOut className="h-4 w-4" />,
          shortcut: '⌘ ⇧ Q',
          action: () => {
            signOut();
            setOpen(false);
          },
        },
      ],
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className={`${styles.commandPaletteContent} ${styles.commandPalette}`}>
        <CommandInput
          placeholder="Suchst du nach einer Aktion oder Seite? Oder möchtest du etwas machen?"
          className="placeholder-muted-foreground/60"
        />

        <CommandList className="max-h-[400px]">
        {/* Zuletzt verwendet */}
        {recentItems.length > 0 && (
          <>
            <CommandGroup heading="Zuletzt verwendet" className="overflow-hidden">
              {recentItems.map((item) => (
                <CommandItem
                  key={`recent-${item.id}`}
                  value={`${item.title} ${item.category}`}
                  onSelect={() => {
                    if (item.path) {
                      navigate(item.path);
                      setOpen(false);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Clock className="mr-2 h-4 w-4 opacity-60" />
                  <span>{item.title}</span>
                  <span className="ml-auto text-xs opacity-50">
                    {item.category}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Alle Groups */}
        {groups.map((group) => (
          <div key={group.id}>
            <CommandGroup heading={group.title}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.description || ''}`}
                  onSelect={() => {
                    if (item.href) {
                      handleNavigation(item.href, item.title, item.id);
                    } else if (item.action) {
                      handleAction(item.action, item.title);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <div className="mr-2 h-4 w-4 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
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
            <p className="text-muted-foreground mb-2">
              Keine Aktion gefunden für „{/* search term */}"
            </p>
            <a
              href="/help"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-xs"
            >
              Zur Dokumentation →
            </a>
          </div>
        </CommandEmpty>
      </CommandList>

      {/* Footer Hinweis */}
      <div className="border-t border-border/50 px-2 py-2 text-xs text-muted-foreground text-center">
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground opacity-100">
          <span className="text-xs">ESC</span>
        </kbd>
        <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground opacity-100">
          <span className="text-xs">⌘K</span>
        </kbd>
        {' zum Schließen'}{' '}
      </div>
      </div>
    </CommandDialog>
  );
}
