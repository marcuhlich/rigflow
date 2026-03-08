import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QrCode, Edit2, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { ItemForm } from "@/components/ItemForm";
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "@/hooks/useInventory";
import { useLendingHistory } from "@/hooks/useLendingHistory";
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

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, updateItem, deleteItem } = useInventory();
  const { getItemHistory } = useLendingHistory();
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const foundItem = items.find(i => i.id === id);
      setItem(foundItem || null);
      setIsLoading(false);
    }
  }, [id, items]);

  const handleEditSubmit = async (data: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!item) return;
    
    try {
      await updateItem(item.id, data);
      setIsEditOpen(false);
      toast({
        title: "Item aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Item konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    try {
      await deleteItem(item.id);
      toast({
        title: "Item gelöscht",
        description: "Das Item wurde erfolgreich entfernt.",
      });
      setIsDeleteOpen(false);
      navigate("/inventory");
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Item konnte nicht gelöscht werden.",
        variant: "destructive",
      });
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
        <Button
          variant="ghost"
          onClick={() => navigate("/inventory")}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurück
        </Button>
        <Card className="p-12 text-center">
          <h3 className="text-lg font-medium">Item nicht gefunden</h3>
          <p className="text-muted-foreground mt-1">
            Das gesuchte Item existiert nicht.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => navigate("/inventory")}
          className="gap-2 self-start"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurück
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQROpen(true)}
            className="gap-2 flex-1 sm:flex-none min-w-0"
          >
            <QrCode className="h-4 w-4 shrink-0" />
            <span className="truncate">QR-Code</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="gap-2 flex-1 sm:flex-none min-w-0"
          >
            <Edit2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Bearbeiten</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="gap-2 flex-1 sm:flex-none min-w-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Löschen</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4">
          {/* Header Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{item.name}</h1>
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="outline">{item.category}</Badge>
                  <StatusBadge condition={item.condition} />
                </div>
              </div>
            </div>
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full max-h-64 object-cover rounded-lg mt-4 border border-border"
              />
            )}
          </Card>

          {/* Details Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Menge
                </label>
                <p className="text-lg mt-1">{item.quantity}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Standort
                </label>
                <p className="text-lg mt-1">{item.location}</p>
              </div>

              {item.unit_price && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Preis pro Einheit
                  </label>
                  <p className="text-lg mt-1">€ {item.unit_price.toFixed(2)}</p>
                </div>
              )}

              {item.accessories && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Zubehör
                  </label>
                  <p className="text-lg mt-1">{item.accessories}</p>
                </div>
              )}

              {item.condition === 'verliehen' && item.lent_to && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Verliehen an
                    </label>
                    <p className="text-lg mt-1">{item.lent_to}</p>
                  </div>
                  
                  {item.lent_until && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Rückgabe bis
                      </label>
                      <p className="text-lg mt-1">
                        {format(new Date(item.lent_until), "dd. MMMM yyyy", {
                          locale: de,
                        })}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* DMX Info */}
          {item.dmx_start_address && (
            <Card className="p-6 border-primary/20 bg-primary/5">
              <h2 className="text-lg font-semibold mb-4">DMX-Konfiguration</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Universe
                  </label>
                  <p className="text-lg mt-1">{item.dmx_universe || 1}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Start-Adresse
                  </label>
                  <p className="text-lg mt-1">{item.dmx_start_address}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Kanäle
                  </label>
                  <p className="text-lg mt-1">{item.dmx_channels || 1}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Notes */}
          {item.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Notizen</h2>
              <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
            </Card>
          )}

          {/* Lending History */}
          {(() => {
            const history = getItemHistory(item.id);
            if (history.length === 0) return null;
            return (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Verleih-Historie</h2>
                <div className="space-y-3">
                  {history.map(record => (
                    <div
                      key={record.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        !record.returned_at ? 'border-warning/40 bg-warning/5' : 'border-border'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">an {record.lent_to}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.lent_at), "dd. MMM yyyy", { locale: de })}
                          {record.due_date && ` · Fällig: ${format(new Date(record.due_date), "dd. MMM yyyy", { locale: de })}`}
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
            );
          })()}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* QR Code Preview */}
          <Card className="p-6 text-center">
            <h3 className="font-semibold mb-4">Item-ID</h3>
            <code className="text-xs bg-muted p-3 rounded-lg block break-all font-mono">
              {item.id}
            </code>
            <p className="text-xs text-muted-foreground mt-3">
              Scanne einen QR-Code zum schnellen Zugriff
            </p>
          </Card>

          {/* Meta Info */}
          <Card className="p-6 text-sm space-y-2">
            <div>
              <label className="font-medium text-muted-foreground">
                Erstellt
              </label>
              <p>
                {format(new Date(item.created_at), "dd. MMMM yyyy", {
                  locale: de,
                })}
              </p>
            </div>
            {item.updated_at && (
              <div>
                <label className="font-medium text-muted-foreground">
                  Aktualisiert
                </label>
                <p>
                  {format(new Date(item.updated_at), "dd. MMMM yyyy", {
                    locale: de,
                  })}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* QR Code Display Dialog */}
      <QRCodeDisplay
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        itemId={item.id}
        itemName={item.name}
        itemDetails={{
          category: item.category,
          quantity: item.quantity,
          location: item.location,
        }}
        size="lg"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Item löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              "{item.name}" wird permanent gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
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

      {/* Edit Dialog */}
      <ItemForm
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        editItem={item}
      />
    </div>
  );
}
