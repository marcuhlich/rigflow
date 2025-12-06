import { useMemo, useState } from "react";
import { AlertTriangle, Sliders, Table as TableIcon, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useInventory } from "@/hooks/useInventory";
import { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface DMXDevice extends InventoryItem {
  dmx_end_address: number;
}

interface DMXOverlap {
  device1: DMXDevice;
  device2: DMXDevice;
  universe: number;
}

export default function DMXPatchplan() {
  const { allItems, loading } = useInventory();
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Filter devices with DMX data
  const dmxDevices = useMemo((): DMXDevice[] => {
    return allItems
      .filter(item => item.dmx_start_address && item.dmx_channels)
      .map(item => ({
        ...item,
        dmx_end_address: (item.dmx_start_address || 0) + (item.dmx_channels || 1) - 1,
      }))
      .sort((a, b) => {
        const universeA = a.dmx_universe || 1;
        const universeB = b.dmx_universe || 1;
        if (universeA !== universeB) return universeA - universeB;
        return (a.dmx_start_address || 0) - (b.dmx_start_address || 0);
      });
  }, [allItems]);

  // Detect overlaps
  const overlaps = useMemo((): DMXOverlap[] => {
    const found: DMXOverlap[] = [];
    for (let i = 0; i < dmxDevices.length; i++) {
      for (let j = i + 1; j < dmxDevices.length; j++) {
        const d1 = dmxDevices[i];
        const d2 = dmxDevices[j];
        const u1 = d1.dmx_universe || 1;
        const u2 = d2.dmx_universe || 1;
        
        if (u1 === u2) {
          const start1 = d1.dmx_start_address || 0;
          const end1 = d1.dmx_end_address;
          const start2 = d2.dmx_start_address || 0;
          const end2 = d2.dmx_end_address;
          
          if (start1 <= end2 && start2 <= end1) {
            found.push({ device1: d1, device2: d2, universe: u1 });
          }
        }
      }
    }
    return found;
  }, [dmxDevices]);

  // Group devices by universe for timeline
  const universeGroups = useMemo(() => {
    const groups: Record<number, DMXDevice[]> = {};
    dmxDevices.forEach(device => {
      const universe = device.dmx_universe || 1;
      if (!groups[universe]) groups[universe] = [];
      groups[universe].push(device);
    });
    return Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [dmxDevices]);

  const isDeviceInOverlap = (deviceId: string) => {
    return overlaps.some(o => o.device1.id === deviceId || o.device2.id === deviceId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            DMX Patchplan
          </h2>
          <p className="text-muted-foreground mt-1">
            {dmxDevices.length} Geräte mit DMX-Konfiguration
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-2"
          >
            <TableIcon className="h-4 w-4" />
            Tabelle
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Timeline
          </Button>
        </div>
      </div>

      {/* Overlap Warning */}
      {overlaps.length > 0 && (
        <Alert variant="destructive" className="glass-card border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>DMX-Adresskonflikte erkannt!</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1">
              {overlaps.map((overlap, i) => (
                <li key={i}>
                  <strong>{overlap.device1.name}</strong> ({overlap.device1.dmx_start_address}-{overlap.device1.dmx_end_address}) 
                  {" "}überschneidet sich mit{" "}
                  <strong>{overlap.device2.name}</strong> ({overlap.device2.dmx_start_address}-{overlap.device2.dmx_end_address})
                  {" "}in Universum {overlap.universe}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {dmxDevices.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Sliders className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Keine DMX-Geräte gefunden</h3>
          <p className="text-muted-foreground mt-1">
            Füge DMX-Adressen zu deinen Lichttechnik- oder Effektgeräten hinzu.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Universum</TableHead>
                <TableHead className="text-center">Start</TableHead>
                <TableHead className="text-center">Ende</TableHead>
                <TableHead className="text-center">Kanäle</TableHead>
                <TableHead>Standort</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dmxDevices.map((device) => (
                <TableRow
                  key={device.id}
                  className={cn(
                    "border-border/30 transition-colors",
                    isDeviceInOverlap(device.id) && "bg-destructive/10"
                  )}
                >
                  <TableCell className="font-medium">
                    {device.name}
                    {isDeviceInOverlap(device.id) && (
                      <AlertTriangle className="h-4 w-4 text-destructive inline ml-2" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">{device.dmx_universe || 1}</TableCell>
                  <TableCell className="text-center font-mono">{device.dmx_start_address}</TableCell>
                  <TableCell className="text-center font-mono">{device.dmx_end_address}</TableCell>
                  <TableCell className="text-center">{device.dmx_channels}</TableCell>
                  <TableCell className="text-muted-foreground">{device.location}</TableCell>
                  <TableCell>
                    <StatusBadge condition={device.condition} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-6">
          {universeGroups.map(([universe, devices]) => (
            <div key={universe} className="glass-card p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Universum {universe}
              </h3>
              <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
                {/* Address markers */}
                <div className="absolute inset-0 flex justify-between px-2 text-[10px] text-muted-foreground pt-0.5">
                  <span>1</span>
                  <span>128</span>
                  <span>256</span>
                  <span>384</span>
                  <span>512</span>
                </div>
                {/* Device blocks */}
                {devices.map((device) => {
                  const start = device.dmx_start_address || 1;
                  const end = device.dmx_end_address;
                  const left = ((start - 1) / 512) * 100;
                  const width = ((end - start + 1) / 512) * 100;
                  const hasOverlap = isDeviceInOverlap(device.id);

                  return (
                    <div
                      key={device.id}
                      className={cn(
                        "absolute top-5 h-6 rounded flex items-center justify-center text-[10px] font-medium px-1 truncate",
                        hasOverlap
                          ? "bg-destructive/80 text-destructive-foreground"
                          : "bg-primary/80 text-primary-foreground"
                      )}
                      style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                      title={`${device.name}: ${start}-${end}`}
                    >
                      {width > 5 && device.name}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
