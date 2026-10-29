import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CheckSquare, Clock, FileText, FolderKanban, HandCoins, LayoutDashboard, LayoutGrid,
  LogOut, MessageSquare, Moon, Package, Plus, ScanLine, Search, Settings, Sliders, Sun,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { useRecentItems } from "@/hooks/useRecentItems";
import { useToast } from "@/hooks/use-toast";
import { applyTheme, type Theme } from "@/lib/appearanceUtils";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import styles from "@/styles/CommandPalette.module.css";

const THEME_STORAGE_KEY = "rigflow:theme";
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

type GroupId = "navigation" | "actions" | "appearance" | "support" | "account";

interface PaletteCommand {
  id: string;
  group: GroupId;
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Keys shown as hint, e.g. [MOD, "I"] */
  shortcut?: string[];
  /** Navigation target – also stored in "recent" */
  path?: string;
  run: () => void;
}

/** True if keyboard input currently goes into an editable control. */
function isEditable(el: EventTarget | Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return !!el.closest('[contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"]');
}

/** Any Radix dialog/sheet open? Single-key shortcuts must not fire behind it. */
const hasOpenModal = () =>
  !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-sunken px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { recentItems, addItem } = useRecentItems();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const isLoggedIn = !!user;

  // Track theme changes from anywhere (settings page, system preference)
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Close and forget the query when the user logs out
  useEffect(() => {
    if (!isLoggedIn) setOpen(false);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const openPalette = () => setOpen(true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
  }, [isLoggedIn]);

  const handleSignOut = useCallback(() => {
    signOut().catch((err: unknown) => logger.error("CommandPalette", "Sign out failed", err));
  }, [signOut]);

  const toggleTheme = useCallback(() => {
    const next: Theme = isDark ? "hell" : "dunkel";
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
    toast({ title: next === "hell" ? t("command.appearance.light_activated") : t("command.appearance.dark_activated") });
  }, [isDark, t, toast]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const go = (path: string) => () => navigate(path);
    return [
      // Navigation
      { id: "go-dashboard", group: "navigation", title: t("nav.dashboard"), icon: LayoutDashboard, path: "/", run: go("/") },
      { id: "go-inventory", group: "navigation", title: t("command.nav.inventory_title"), description: t("command.nav.inventory_desc"), icon: Package, shortcut: [MOD, "I"], path: "/inventory", run: go("/inventory") },
      { id: "go-projects", group: "navigation", title: t("command.nav.projects_title"), description: t("command.nav.projects_desc"), icon: FolderKanban, shortcut: [MOD, "E"], path: "/projects", run: go("/projects") },
      { id: "go-lending", group: "navigation", title: t("command.nav.lending_title"), description: t("command.nav.lending_desc"), icon: HandCoins, path: "/lending", run: go("/lending") },
      { id: "go-dmx", group: "navigation", title: t("nav.dmx"), icon: Sliders, path: "/dmx", run: go("/dmx") },
      { id: "go-profile", group: "navigation", title: t("nav.settings"), description: t("command.nav.profile_desc"), icon: Settings, path: "/settings", run: go("/settings") },
      // Actions
      { id: "new-item", group: "actions", title: t("command.actions.new_item_title"), description: t("command.actions.new_item_desc"), icon: Plus, shortcut: ["N"], path: "/inventory?action=new-item", run: go("/inventory?action=new-item") },
      { id: "qr-scanner", group: "actions", title: t("command.actions.qr_title"), description: t("command.actions.qr_desc"), icon: ScanLine, shortcut: ["S"], path: "/scanner", run: go("/scanner") },
      { id: "search-inventory", group: "actions", title: t("command.actions.search_title"), description: t("command.actions.search_desc"), icon: Search, shortcut: ["/"], path: "/inventory", run: go("/inventory") },
      { id: "toggle-view", group: "actions", title: t("command.actions.toggle_view_title"), description: t("command.actions.toggle_view_desc"), icon: LayoutGrid, shortcut: ["V"], run: go("/inventory?action=toggle-view") },
      { id: "selection-mode", group: "actions", title: t("command.actions.selection_title"), description: t("command.actions.selection_desc"), icon: CheckSquare, shortcut: ["M"], run: go("/inventory?action=toggle-selection") },
      // Appearance
      {
        id: "toggle-theme", group: "appearance",
        title: isDark ? t("command.appearance.light_mode") : t("command.appearance.dark_mode"),
        description: isDark ? t("command.appearance.switch_to_light") : t("command.appearance.switch_to_dark"),
        icon: isDark ? Sun : Moon, run: toggleTheme,
      },
      // Support
      { id: "help", group: "support", title: t("command.support.docs_title"), description: t("command.support.docs_desc"), icon: FileText, path: "/help", run: go("/help") },
      {
        id: "feedback", group: "support", title: t("command.support.feedback_title"), description: t("command.support.feedback_desc"), icon: MessageSquare,
        run: () => { window.location.href = "mailto:?subject=Feedback%20-%20RigFlow"; },
      },
      // Account
      {
        id: "logout", group: "account", title: t("auth.logout"),
        description: user?.email ? t("command.account.logout_desc", { email: user.email }) : undefined,
        icon: LogOut, shortcut: [MOD, "⇧", "Q"], run: handleSignOut,
      },
    ];
  }, [t, navigate, isDark, toggleTheme, handleSignOut, user?.email]);

  const byId = useMemo(() => new Map(commands.map((c) => [c.id, c])), [commands]);

  const runCommand = useCallback(
    (cmd: PaletteCommand) => {
      setOpen(false);
      if (cmd.id !== "logout" && cmd.id !== "toggle-theme") {
        addItem({ id: cmd.id, title: cmd.title, category: t(`command.groups.${cmd.group}`), path: cmd.path });
      }
      cmd.run();
    },
    [addItem, t]
  );

  const searchInventory = (q: string) => {
    setOpen(false);
    navigate(`/inventory?search=${encodeURIComponent(q)}`);
  };

  // ── Global keyboard shortcuts (only for signed-in users) ─────────────────
  const shortcutRef = useRef({ open, byId, runCommand, handleSignOut });
  useEffect(() => {
    shortcutRef.current = { open, byId, runCommand, handleSignOut };
  });

  useEffect(() => {
    if (!isLoggedIn) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const { open: isOpen, byId: cmds, runCommand: run, handleSignOut: logout } = shortcutRef.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && !e.altKey && !e.shiftKey && key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (isOpen || e.repeat) return;
      if (isEditable(e.target) || isEditable(document.activeElement)) return;
      if (hasOpenModal()) return;

      const trigger = (id: string) => {
        const cmd = cmds.get(id);
        if (!cmd) return;
        e.preventDefault();
        run(cmd);
      };

      if (mod && !e.altKey) {
        if (e.shiftKey) {
          if (key === "q") { e.preventDefault(); logout(); }
          return;
        }
        if (key === "i") trigger("go-inventory");
        else if (key === "e") trigger("go-projects");
        else if (key === "n") trigger("new-item");
        else if (key === "s") trigger("qr-scanner");
        else if (key === "f") { e.preventDefault(); setOpen(true); }
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); setOpen(true); }
      else if (key === "n" || e.key === "+") trigger("new-item");
      else if (key === "s") trigger("qr-scanner");
      else if (key === "v") trigger("toggle-view");
      else if (key === "m") trigger("selection-mode");
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isLoggedIn]);

  if (!isLoggedIn) return null;

  const groupOrder: GroupId[] = ["navigation", "actions", "appearance", "support", "account"];
  const trimmedQuery = query.trim();
  const recent = trimmedQuery ? [] : recentItems;

  const renderItem = (cmd: PaletteCommand, valuePrefix = "") => (
    <CommandItem
      key={`${valuePrefix}${cmd.id}`}
      value={`${valuePrefix}${cmd.id} ${cmd.title}`}
      keywords={cmd.description ? [cmd.description] : undefined}
      onSelect={() => runCommand(cmd)}
      className="h-9 cursor-pointer gap-3 rounded-md px-2.5 text-[13px]"
    >
      <cmd.icon data-icon="" className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="shrink-0 truncate font-medium">{cmd.title}</span>
      {cmd.description && (
        <span className="hidden min-w-0 truncate text-muted-foreground sm:block">{cmd.description}</span>
      )}
      {cmd.shortcut && (
        <span className="ml-auto hidden shrink-0 items-center gap-1 sm:flex">
          {cmd.shortcut.map((k) => <Kbd key={k}>{k}</Kbd>)}
        </span>
      )}
    </CommandItem>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 dark:bg-black/60" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-[max(1rem,10vh)] z-50 w-[calc(100vw-1.5rem)] max-w-[640px] -translate-x-1/2",
            "overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/10 outline-none",
            "duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            styles.palette
          )}
        >
          <DialogPrimitive.Title className="sr-only">{t("nav.search")}</DialogPrimitive.Title>
          <Command loop className="rounded-none bg-transparent">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={t("command.placeholder")}
              className="h-12 text-[15px] sm:text-sm"
            />
            <CommandList className="max-h-[min(60dvh,420px)] p-1.5">
              <CommandEmpty className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                {t("command.empty")}
              </CommandEmpty>

              {trimmedQuery && (
                <CommandGroup heading={t("command.groups.actions")} forceMount>
                  <CommandItem
                    value={`__search ${trimmedQuery}`}
                    forceMount
                    onSelect={() => searchInventory(trimmedQuery)}
                    className="h-9 cursor-pointer gap-3 rounded-md px-2.5 text-[13px]"
                  >
                    <Search data-icon="" className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {t("command.search_inventory_for", { query: trimmedQuery })}
                    </span>
                    <span className="ml-auto hidden sm:flex"><Kbd>↵</Kbd></span>
                  </CommandItem>
                </CommandGroup>
              )}

              {recent.length > 0 && (
                <>
                  <CommandGroup heading={t("command.recent")}>
                    {recent.map((item) => {
                      const cmd = byId.get(item.id);
                      return (
                        <CommandItem
                          key={`recent-${item.id}`}
                          value={`recent-${item.id} ${item.title}`}
                          onSelect={() => {
                            if (cmd) runCommand(cmd);
                            else if (item.path) { setOpen(false); navigate(item.path); }
                          }}
                          className="h-9 cursor-pointer gap-3 rounded-md px-2.5 text-[13px]"
                        >
                          <Clock data-icon="" className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">{cmd?.title ?? item.title}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{item.category}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  <CommandSeparator className="mx-1 my-1" />
                </>
              )}

              {groupOrder.map((group) => (
                <CommandGroup key={group} heading={t(`command.groups.${group}`)}>
                  {commands.filter((c) => c.group === group).map((c) => renderItem(c))}
                </CommandGroup>
              ))}
            </CommandList>

            <div className="hidden items-center gap-4 border-t border-border bg-surface-sunken px-3 py-2 text-[11px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd>{t("command.hint_navigate")}</span>
              <span className="flex items-center gap-1.5"><Kbd>↵</Kbd>{t("command.hint_select")}</span>
              <span className="ml-auto flex items-center gap-1.5"><Kbd>esc</Kbd>{t("command.close_hint")}</span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
