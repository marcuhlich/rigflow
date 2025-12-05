import { Pencil, Trash2, MoreVertical, Package } from "lucide-react";
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
import { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export function InventoryTable({ items, onEdit, onDelete }: InventoryTableProps) {
  if (items.length === 0) {
    return (
      <div className="glass-card p-12 text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted/30">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Keine Items gefunden</h3>
            <p className="text-muted-foreground mt-1">
              Füge dein erstes Item hinzu oder ändere die Filter.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
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
          {items.map((item, index) => (
            <TableRow 
              key={item.id} 
              className={cn(
                "border-border/30 transition-colors hover:bg-muted/20",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TableCell className="font-medium">{item.name}</TableCell>
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
  );
}
