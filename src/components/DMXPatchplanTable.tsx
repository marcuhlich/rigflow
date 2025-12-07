import { useState } from 'react';
import { PatchplanRow, DMXConflict } from '@/lib/dmxPatchplan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { AlertTriangle, Edit2, Check, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface DMXPatchplanTableProps {
  rows: PatchplanRow[];
  conflicts: DMXConflict[];
  onAddressChange?: (itemId: string, newAddress: number) => Promise<void>;
  onUniverseChange?: (itemId: string, newUniverse: number) => Promise<void>;
  onAutoAssign?: (itemId: string, universe: number) => Promise<void>;
  loading?: boolean;
}

interface EditState {
  rowId: string | null;
  type: 'address' | 'universe';
  value: string;
}

export function DMXPatchplanTable({
  rows,
  conflicts,
  onAddressChange,
  onUniverseChange,
  onAutoAssign,
  loading = false,
}: DMXPatchplanTableProps) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const { toast } = useToast();

  const hasConflict = (row: PatchplanRow): boolean => {
    return conflicts.some(
      c => c.row1.itemId === row.itemId || c.row2.itemId === row.itemId
    );
  };

  const getConflictMessage = (row: PatchplanRow): string => {
    const conflict = conflicts.find(
      c =>
        (c.row1.itemId === row.itemId && c.row1.instanceNumber === row.instanceNumber) ||
        (c.row2.itemId === row.itemId && c.row2.instanceNumber === row.instanceNumber)
    );
    if (!conflict) return '';

    const otherRow = conflict.row1.itemId === row.itemId ? conflict.row2 : conflict.row1;
    return `Überschneidet sich mit ${otherRow.itemName} (${otherRow.startAddress}-${otherRow.endAddress})`;
  };

  const handleStartEdit = (row: PatchplanRow, type: 'address' | 'universe') => {
    setEditState({
      rowId: row.id,
      type,
      value: type === 'address' ? row.startAddress.toString() : row.universe.toString(),
    });
    setEditingItem(row.itemId);
  };

  const handleSaveEdit = async () => {
    if (!editState || !editingItem) return;

    try {
      const value = parseInt(editState.value);
      if (isNaN(value)) {
        toast({
          title: 'Fehler',
          description: 'Ungültige Eingabe',
          variant: 'destructive',
        });
        return;
      }

      if (editState.type === 'address') {
        if (value < 1 || value > 512) {
          toast({
            title: 'Fehler',
            description: 'Adresse muss zwischen 1 und 512 liegen',
            variant: 'destructive',
          });
          return;
        }
        await onAddressChange?.(editingItem, value);
      } else {
        if (value < 1) {
          toast({
            title: 'Fehler',
            description: 'Universe muss >= 1 sein',
            variant: 'destructive',
          });
          return;
        }
        await onUniverseChange?.(editingItem, value);
      }

      setEditState(null);
      setEditingItem(null);
    } catch (error) {
      logger.error('Error saving edit:', error);
      toast({
        title: 'Fehler',
        description: 'Änderung konnte nicht gespeichert werden',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditState(null);
    setEditingItem(null);
  };

  return (
    <div className="glass-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead>Gerät</TableHead>
            <TableHead className="text-center">Inst.</TableHead>
            <TableHead className="text-center">Universe</TableHead>
            <TableHead className="text-center">Start-Adresse</TableHead>
            <TableHead className="text-center">End-Adresse</TableHead>
            <TableHead className="text-center">Kanäle</TableHead>
            <TableHead>Standort</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const conflict = hasConflict(row);
            const isEditing = editingItem === row.itemId;

            return (
              <TableRow
                key={row.id}
                className={cn(
                  'border-border/30 transition-colors',
                  conflict && 'bg-destructive/10'
                )}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {conflict && (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <div>
                      <div>{row.itemName}</div>
                      {conflict && (
                        <div className="text-xs text-destructive mt-1">
                          {getConflictMessage(row)}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-center text-sm">
                  {row.instanceNumber}/{row.totalInstances}
                </TableCell>

                <TableCell className="text-center">
                  {editState?.rowId === row.id && editState.type === 'universe' ? (
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        type="number"
                        min="1"
                        value={editState.value}
                        onChange={e => 
                          setEditState({...editState, value: e.target.value})
                        }
                        className="w-16 h-8 text-center"
                        disabled={loading}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleSaveEdit}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-mono">{row.universe}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => handleStartEdit(row, 'universe')}
                        disabled={loading}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-center font-mono">
                  {editState?.rowId === row.id && editState.type === 'address' ? (
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        type="number"
                        min="1"
                        max="512"
                        value={editState.value}
                        onChange={e =>
                          setEditState({...editState, value: e.target.value})
                        }
                        className="w-20 h-8 text-center"
                        disabled={loading}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleSaveEdit}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 group">
                      <span>{row.startAddress}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => handleStartEdit(row, 'address')}
                        disabled={loading}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-center font-mono text-muted-foreground">
                  {row.endAddress}
                </TableCell>

                <TableCell className="text-center">{row.channels}ch</TableCell>

                <TableCell className="text-muted-foreground text-sm">{row.location}</TableCell>

                <TableCell>
                  <StatusBadge condition={row.condition as any} />
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${row.startAddress}-${row.endAddress}`);
                        toast({
                          description: 'Adressbereich kopiert',
                        });
                      }}
                      title="Adressbereich kopieren"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAutoAssign?.(row.itemId, row.universe)}
                      disabled={loading || isEditing}
                      title="Nächsten verfügbaren Kanal automatisch zuweisen"
                    >
                      Auto
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {rows.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          Keine DMX-Geräte konfiguriert
        </div>
      )}
    </div>
  );
}
