// src/pages/ItemDetail.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { QrCode, Edit2, Trash2, ChevronLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { ItemForm } from "@/components/ItemForm";
import { MaintenanceTimeline } from "@/components/MaintenanceTimeline";
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "@/hooks/useInventory";
import { useLendingHistory } from "@/hooks/useLendingHistory";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useCategories } from "@/hooks/useCategories";

// ── Copy-ID Button ─────────────────────────────────────────────────────────────
function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted-foreground/10 transition-colors"
      title="ID kopieren"
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-primary transition-all duration-200 scale-110" />
        : <Copy  className="h-3.5 w-3.5 text-muted-foreground transition-all duration-200 hover:scale-110" />}
    </button>
  );
}

type Tab = "details" | "wartung";

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ItemDetail() {
  const { id }                            = useParams<{ id: string }>();
  const navigate                          = useNavigate();
  const [searchParams, setSearchParams]   = useSearchParams();
  const { toast }                         = useToast();
  const { items, updateItem, deleteItem } = useInventory();
  const { addRecord, getItemHistory }     = useLendingHistory();
  const { categories }                    = useCategories();

  // Tab aus URL lesen – unbekannte Werte fallen auf "details" zurück
  const rawTab    = searchParams.get("tab");
  const activeTab = (rawTab === "wartung" ? "wartung" : "details") as Tab;

  const [item,         setItem        ] = useState<InventoryItem | null>(null);
  const [isLoading,    setIsLoading   ] = useState(true);
  const [isQROpen,     setIsQROpen    ] = useState(false);
  const [isEditOpen,   setIsEditOpen  ] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [tabChanging,  setTabChanging ] = useState(false);

  useEffect(() => {
    if (id) {
      const foundItem = items.find(i => i.id === id);
      setItem(foundItem || null);
      setIsLoading(false);
    }
  }, [id, items]);

  const itemWithInterval = item as (InventoryItem & { maintenance_interval_days?: number | null }) | null;
  const { overdue: maintOverdue, warning: maintWarning } = useMaintenanceStatus(
    item?.id ?? "",
    itemWithInterval?.maintenance_interval_days,
  );

  const handleMaintStatus = useCallback((_overdue: boolean, _warning: boolean) => {}, []);

  // ── Animated tab switch ────────────────────────────────────────────────────
  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return;
    setTabChanging(true);
    setTimeout(() => {
      // Tab in URL schreiben; "details" ist der Default → param entfernen
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (tab === "details") next.delete("tab");
        else next.set("tab", tab);
        return next;
      }, { replace: true });
      setTabChanging(false);
    }, 120);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEditSubmit = async (
    data: Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">,
  ) => {
    if (!item) return;
    try {
      if (data.condition === "verliehen" && item.condition !== "verliehen" && data.lent_to) {
        await addRecord({
          item_id:     item.id,
          item_name:   data.name,
          lent_to:     data.lent_to,
          lent_at:     new Date().toISOString().split("T")[0],
          due_date:    data.lent_until || null,
          returned_at: null,
          notes:       null,
        });
      }
      await updateItem(item.id, data);
      setIsEditOpen(false);
      toast({ title: "Item aktualisiert", description: "Die Änderungen wurden gespeichert." });
    } catch {
      toast({ title: "Fehler", description: "Item konnte nicht aktualisiert werden.", variant: "destructive" });
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!item) return;
    try {
      await deleteItem(item.id);
      toast({
        title: "In Papierkorb verschoben",
        description: `„${item.name}" kann im Papierkorb wiederhergestellt werden.`,
      });
      setIsDeleteOpen(false);
      navigate("/inventory");
    } catch {
      toast({ title: "Fehler", description: "Item konnte nicht gelöscht werden.", variant: "destructive" });
      setIsDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/inventory")} className="gap-2">
          <ChevronLeft className="h-4 w-4" />Zurück
        </Button>
        <Card className="p-12 text-center">
          <h3 className="text-lg font-medium">Item nicht gefunden</h3>
          <p className="text-muted-foreground mt-1">Das gesuchte Item existiert nicht.</p>
        </Card>
      </div>
    );
  }

  const history      = getItemHistory(item.id);
  const tabDotColor  = maintOverdue ? "bg-destructive" : maintWarning ? "bg-amber-500" : null;

  return (
    <>
      {/* ── Keyframe-Definitionen ── */}
      <style>{`
        @keyframes tab-content-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tab-content-enter {
          animation: tab-content-in 0.18s ease forwards;
        }
        @keyframes action-btn-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.94); }
          100% { transform: scale(1); }
        }
        .action-btn-pop:active { animation: action-btn-pop 0.15s ease; }
      `}</style>

      <div className="space-y-6 overflow-x-hidden pt-4">

        {/* Top action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/inventory")}
            className="gap-2 self-start transition-transform duration-150 hover:-translate-x-0.5 active:translate-x-0"
          >
            <ChevronLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
            Zurück
          </Button>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "QR-Code", icon: <QrCode className="h-4 w-4 shrink-0" />, onClick: () => setIsQROpen(true), extra: "" },
              { label: "Bearbeiten", icon: <Edit2 className="h-4 w-4 shrink-0" />, onClick: () => setIsEditOpen(true), extra: "" },
              { label: "Löschen", icon: <Trash2 className="h-4 w-4 shrink-0" />, onClick: () => setIsDeleteOpen(true), extra: "text-destructive hover:text-destructive" },
            ].map(({ label, icon, onClick, extra }) => (
              <Button
                key={label}
                variant="outline" size="sm"
                onClick={onClick}
                className={`gap-2 flex-1 sm:flex-none min-w-0 action-btn-pop
                  transition-all duration-150 hover:shadow-sm hover:-translate-y-px active:translate-y-0 ${extra}`}
              >
                {icon}<span className="truncate">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">

          {/* Main column */}
          <div className="md:col-span-2 space-y-4">

            {/* Header card */}
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold">{item.name}</h1>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{item.category}</Badge>
                      <StatusBadge condition={item.condition} />
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                              bg-primary/15 text-primary border border-primary/25
                              transition-all duration-150 hover:bg-primary/25 hover:scale-105 cursor-default"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {item.image_url && (
                <img
                  src={item.image_url} alt={item.name}
                  className="w-full max-h-64 object-cover rounded-lg mt-4 border border-border
                    transition-transform duration-300 hover:scale-[1.01]"
                />
              )}
            </Card>

            {/* Tabs */}
            <div className="border-b border-border flex gap-1 relative">
              {(["details", "wartung"] as Tab[]).map(tab => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                    className={`
                      relative px-4 py-2.5 text-sm font-medium border-b-2 rounded-t-md
                      transition-all duration-200 select-none outline-none
                      ${isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    {/* Hover-Hintergrund pill */}
                    {!isActive && (
                      <span className="absolute inset-0 rounded-t-md bg-muted/0 hover:bg-muted/50 transition-colors duration-150" />
                    )}

                    <span className="relative flex items-center gap-1.5">
                      {tab === "details" ? "Details" : "Wartung"}

                      {/* Animierter Status-Dot */}
                      {tab === "wartung" && tabDotColor && (
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${tabDotColor}`} />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${tabDotColor}`} />
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab-Content mit Fade-in */}
            <div
              key={activeTab}
              className={`space-y-4 ${tabChanging ? "opacity-0" : "tab-content-enter"}`}
            >
              {/* Tab: Details */}
              {activeTab === "details" && (
                <>
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                    <Card className="p-6">
                      <h2 className="text-lg font-semibold mb-4">Eigenschaften</h2>
                      <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(item.attributes).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-muted-foreground capitalize">
                              {key.replace(/_/g, " ")}
                            </label>
                            <p className="text-sm mt-1">
                              {typeof value === "boolean" ? (value ? "Ja" : "Nein") : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Details</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Menge</label>
                        <p className="text-lg mt-1">{item.quantity}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Standort</label>
                        <p className="text-lg mt-1">{item.location}</p>
                      </div>
                      {item.unit_price && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Preis pro Einheit</label>
                          <p className="text-lg mt-1">€ {item.unit_price.toFixed(2)}</p>
                        </div>
                      )}
                      {item.accessories && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Zubehör</label>
                          <p className="text-lg mt-1">{item.accessories}</p>
                        </div>
                      )}
                      {item.condition === "verliehen" && item.lent_to && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Verliehen an</label>
                            <p className="text-lg mt-1">{item.lent_to}</p>
                          </div>
                          {item.lent_until && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Rückgabe bis</label>
                              <p className="text-lg mt-1">
                                {format(new Date(item.lent_until), "dd. MMMM yyyy", { locale: de })}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Card>

                  {item.dmx_start_address && (
                    <Card className="p-6 border-primary/20 bg-primary/5">
                      <h2 className="text-lg font-semibold mb-4">DMX-Konfiguration</h2>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Universe</label>
                          <p className="text-lg mt-1">{item.dmx_universe || 1}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Start-Adresse</label>
                          <p className="text-lg mt-1">{item.dmx_start_address}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Kanäle</label>
                          <p className="text-lg mt-1">{item.dmx_channels || 1}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {item.notes && (
                    <Card className="p-6">
                      <h2 className="text-lg font-semibold mb-4">Notizen</h2>
                      <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                    </Card>
                  )}

                  {history.length > 0 && (
                    <Card className="p-6">
                      <h2 className="text-lg font-semibold mb-4">Verleih-Historie</h2>
                      <div className="space-y-3">
                        {history.map(record => (
                          <div
                            key={record.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-150 hover:bg-muted/30 ${
                              !record.returned_at ? "border-warning/40 bg-warning/5" : "border-border"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">an {record.lent_to}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(record.lent_at), "dd. MMM yyyy", { locale: de })}
                                {record.due_date &&
                                  ` · Fällig: ${format(new Date(record.due_date), "dd. MMM yyyy", { locale: de })}`}
                              </p>
                            </div>
                            <Badge variant={record.returned_at ? "secondary" : "outline"} className="shrink-0 ml-2 text-xs">
                              {record.returned_at
                                ? `Zurück ${format(new Date(record.returned_at), "dd.MM.yy")}`
                                : "Aktiv"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* Tab: Wartung */}
              {activeTab === "wartung" && (
                <MaintenanceTimeline
                  itemId={item.id}
                  maintenanceIntervalDays={itemWithInterval?.maintenance_interval_days}
                  onStatusChange={handleMaintStatus}
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-6 text-center">
              <h3 className="font-semibold mb-4">Item-ID</h3>
              <div className="relative group">
                <code className="text-xs bg-muted p-3 rounded-lg block break-all font-mono pr-10
                  transition-colors duration-150 group-hover:bg-muted/70">
                  {item.id}
                </code>
                <CopyIdButton id={item.id} />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Scanne einen QR-Code zum schnellen Zugriff
              </p>
            </Card>

            <Card className="p-6 text-sm space-y-2">
              <div>
                <label className="font-medium text-muted-foreground">Erstellt</label>
                <p>{format(new Date(item.created_at), "dd. MMMM yyyy", { locale: de })}</p>
              </div>
              {item.updated_at && (
                <div>
                  <label className="font-medium text-muted-foreground">Aktualisiert</label>
                  <p>{format(new Date(item.updated_at), "dd. MMMM yyyy", { locale: de })}</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        <QRCodeDisplay
          isOpen={isQROpen} onClose={() => setIsQROpen(false)}
          itemId={item.id} itemName={item.name}
          itemDetails={{ category: item.category, quantity: item.quantity, location: item.location }}
          size="lg"
        />

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Item löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                „{item.name}" wird in den Papierkorb verschoben und kann dort wiederhergestellt werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ItemForm
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSubmit}
          editItem={item}
          categories={categories}
        />
      </div>
    </>
  );
}