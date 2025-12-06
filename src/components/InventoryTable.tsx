import { useState } from "react";
import { Pencil, Trash2, MoreVertical, Package, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export function InventoryTable({ items, onEdit, onDelete, onViewDetails }: InventoryTableProps) {
  const [qrItemId, setQrItemId] = useState<string | null>(null);
  const qrItem = items.find(i => i.id === qrItemId);

  if (items.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted/30">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Keine Items gefunden</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Füge dein erstes Item hinzu oder ändere die Filter.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Name</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Kategorie</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-center">Menge</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Zustand</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Standort</TableHead>
              <TableHead className="text-muted-foreground font-semibold w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow 
                key={item.id} 
                className="border-border/30 transition-colors hover:bg-muted/20"
              >
                <TableCell 
                  className="font-medium cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => onViewDetails?.(item.id)}
                >
                  {item.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.category}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md bg-muted/50 font-medium">
                    {item.quantity}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge condition={item.condition} />
                </TableCell>
                <TableCell className="text-muted-foreground">{item.location}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card border-border/50">
                      <DropdownMenuItem 
                        onClick={() => setQrItemId(item.id)} 
                        className="cursor-pointer"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        QR-Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(item)} className="cursor-pointer">
                        <Pencil className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(item.id)} 
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* QR Code Display Modal */}
      {qrItem && (
        <QRCodeDisplay
          isOpen={!!qrItemId}
          onClose={() => setQrItemId(null)}
          itemId={qrItem.id}
          itemName={qrItem.name}
          itemDetails={{
            category: qrItem.category,
            quantity: qrItem.quantity,
            location: qrItem.location,
          }}
          size="md"
        />
      )}
    </>
  );
}
