import { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  HandCoins,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  Plus,
  History,
  Search,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLendingHistory, LendingRecord } from "@/hooks/useLendingHistory";
import { useInventory } from "@/hooks/useInventory";

function OverdueBadge({ dueDate }: { dueDate: string }) {
  const days = differenceInDays(new Date(), new Date(dueDate));
  if (days <= 0) return null;
  return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <AlertTriangle className="h-3 w-3" />
      {days} {days === 1 ? "Tag" : "Tage"} überfällig
    </Badge>
  );
}

function DueSoonBadge({ dueDate }: { dueDate: string }) {
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0 || days > 3) return null;
  return (
    <Badge variant="outline" className="gap-1 text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
      <Clock className="h-3 w-3" />
      {days === 0 ? "Heute fällig" : `Noch ${days} ${days === 1 ? "Tag" : "Tage"}`}
    </Badge>
  );
}

function LendingCard({
  record,
  onReturn,
  onDelete,
}: {
  record: LendingRecord;
  onReturn: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isOverdue = record.due_date && !record.returned_at && record.due_date < new Date().toISOString().split("T")[0];
  const isDueSoon = record.due_date && !record.returned_at && !isOverdue &&
    differenceInDays(new Date(record.due_date), new Date()) <= 3;

  return (
    <Card className={`p-4 transition-all ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{record.item_name}</h3>
            {record.returned_at && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                Zurückgegeben
              </Badge>
            )}
            {isOverdue && record.due_date && <OverdueBadge dueDate={record.due_date} />}
            {isDueSoon && record.due_date && <DueSoonBadge dueDate={record.due_date} />}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">An:</span> {record.lent_to}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Verliehen: {format(new Date(record.lent_at), "dd. MMM yyyy", { locale: de })}</span>
            {record.due_date && (
              <span>Fällig: {format(new Date(record.due_date), "dd. MMM yyyy", { locale: de })}</span>
            )}
            {record.returned_at && (
              <span>Zurück: {format(new Date(record.returned_at), "dd. MMM yyyy", { locale: de })}</span>
            )}
          </div>
          {record.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{record.notes}"</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!record.returned_at && (
            <Button size="sm" variant="outline" onClick={() => onReturn(record.id)} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rückgabe</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDelete(record.id)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function Lending() {
  const { activeLoans, overdueLoans, completedLoans, records, loading, addRecord, markReturned, deleteRecord } =
    useLendingHistory();
  const { items } = useInventory();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New lending form state
  const [formItemId, setFormItemId] = useState("");
  const [formLentTo, setFormLentTo] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const filteredActive = useMemo(() => {
    if (!search) return activeLoans;
    const q = search.toLowerCase();
    return activeLoans.filter(
      (r) => r.item_name.toLowerCase().includes(q) || r.lent_to.toLowerCase().includes(q)
    );
  }, [activeLoans, search]);

  const filteredCompleted = useMemo(() => {
    if (!search) return completedLoans;
    const q = search.toLowerCase();
    return completedLoans.filter(
      (r) => r.item_name.toLowerCase().includes(q) || r.lent_to.toLowerCase().includes(q)
    );
  }, [completedLoans, search]);

  const handleAdd = async () => {
    const item = items.find((i) => i.id === formItemId);
    if (!item || !formLentTo.trim()) return;
    await addRecord({
      item_id: formItemId,
      item_name: item.name,
      lent_to: formLentTo.trim(),
      lent_at: new Date().toISOString().split("T")[0],
      due_date: formDueDate || null,
      returned_at: null,
      notes: formNotes.trim() || null,
    });
    setIsAddOpen(false);
    setFormItemId("");
    setFormLentTo("");
    setFormDueDate("");
    setFormNotes("");
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteRecord(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <HandCoins className="h-7 w-7 text-primary" />
            Verleih-Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Übersicht aller Verleihvorgänge und Rückgaben
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 self-start">
          <Plus className="h-4 w-4" />
          Neuer Verleih
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{activeLoans.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Aktiv verliehen</p>
        </Card>
        <Card className={`p-4 text-center ${overdueLoans.length > 0 ? "border-destructive/50 bg-destructive/5" : ""}`}>
          <div className={`text-2xl font-bold ${overdueLoans.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {overdueLoans.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Überfällig</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{completedLoans.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Zurückgegeben</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{records.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Gesamt</p>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueLoans.length > 0 && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">
                {overdueLoans.length} überfällige {overdueLoans.length === 1 ? "Rückgabe" : "Rückgaben"}
              </h3>
              <div className="mt-2 space-y-1">
                {overdueLoans.map((r) => (
                  <div key={r.id} className="text-sm flex items-center justify-between gap-2">
                    <span>
                      <span className="font-medium">{r.item_name}</span>
                      <span className="text-muted-foreground"> → {r.lent_to}</span>
                    </span>
                    <Button size="sm" variant="outline" onClick={() => markReturned(r.id)} className="gap-1 h-7 text-xs">
                      <RotateCcw className="h-3 w-3" />
                      Zurück
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Suche nach Artikel oder Person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs with sliding indicator */}
      <SlidingTabs
        tabs={[
          { value: "active", label: `Aktiv (${filteredActive.length})`, icon: <Package className="h-4 w-4" /> },
          { value: "history", label: `Historie (${filteredCompleted.length})`, icon: <History className="h-4 w-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

        <TabsContent value="active" className="space-y-3">
          {filteredActive.length === 0 ? (
            <Card className="p-12 text-center">
              <HandCoins className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-medium">Keine aktiven Verleihvorgänge</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Erstelle einen neuen Verleih über den Button oben.
              </p>
            </Card>
          ) : (
            filteredActive.map((r) => (
              <LendingCard key={r.id} record={r} onReturn={markReturned} onDelete={(id) => setDeleteId(id)} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {filteredCompleted.length === 0 ? (
            <Card className="p-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-medium">Noch keine abgeschlossenen Verleihvorgänge</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Abgeschlossene Verleihvorgänge erscheinen hier.
              </p>
            </Card>
          ) : (
            filteredCompleted.map((r) => (
              <LendingCard key={r.id} record={r} onReturn={markReturned} onDelete={(id) => setDeleteId(id)} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuer Verleih</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Artikel *</Label>
              <Select value={formItemId} onValueChange={setFormItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Artikel auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Verliehen an *</Label>
              <Input
                value={formLentTo}
                onChange={(e) => setFormLentTo(e.target.value)}
                placeholder="Name oder Organisation"
              />
            </div>
            <div className="space-y-2">
              <Label>Rückgabe bis</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDueDate
                      ? format(new Date(formDueDate), "dd. MMM yyyy", { locale: de })
                      : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formDueDate ? new Date(formDueDate) : undefined}
                    onSelect={(date) => setFormDueDate(date ? format(date, "yyyy-MM-dd") : "")}
                    locale={de}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optionale Notizen..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleAdd} disabled={!formItemId || !formLentTo.trim()}>
                Verleih erfassen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Verleiheintrag wird permanent gelöscht.
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
    </div>
  );
}
