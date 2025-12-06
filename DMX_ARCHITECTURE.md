# DMX-Patchplan - Technische Architektur

## System-Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                       React Frontend                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Inventory  │      │  DMXPatchplan│      │  ItemForm    │  │
│  │    Page      │      │     Page     │      │   Component  │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                       │                     │          │
│         └─────────┬─────────────┴─────────────────────┘         │
│                   ↓                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Hooks Layer                                             │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  ┌────────────────┐      ┌──────────────────────────────┐ │ │
│  │  │  useInventory  │─────→│  useDMXPatchplan Hook      │ │ │
│  │  │                │      │  ├─ State Management        │ │ │
│  │  │ ├─ items[]     │      │  ├─ Validations           │ │ │
│  │  │ ├─ addItem()   │      │  ├─ Auto-Assign Logic     │ │ │
│  │  │ ├─ updateItem()│      │  └─ Conflict Detection    │ │ │
│  │  │ └─ deleteItem()│      └──────────────────────────────┘ │ │
│  │  └────────────────┘                                       │ │
│  │         ↓                                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                   ↓                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Utilities Layer                                          │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  dmxPatchplan.ts (Kern-Logik)                      │  │ │
│  │  │                                                     │  │ │
│  │  │  Funktionen:                                       │  │ │
│  │  │  ├─ generatePatchplan()                            │  │ │
│  │  │  ├─ calculateInstanceAddresses()                   │  │ │
│  │  │  ├─ findConflicts()                                │  │ │
│  │  │  ├─ calculateUniverseUsage()                       │  │ │
│  │  │  ├─ findNextAvailableChannel()                     │  │ │
│  │  │  ├─ autoResolveConflicts()                         │  │ │
│  │  │  └─ exportPatchplanAsCSV()                         │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  inventory_items Table                                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Columns:                                               │  │
│  │  ├─ id (UUID)                                          │  │
│  │  ├─ user_id (FK)                                       │  │
│  │  ├─ name, category, quantity                           │  │
│  │  ├─ condition, location, notes                         │  │
│  │  ├─ dmx_start_address (INT, nullable)    ← DMX        │  │
│  │  ├─ dmx_channels (INT, nullable)         ← DMX        │  │
│  │  ├─ dmx_universe (INT, nullable)         ← DMX        │  │
│  │  ├─ lent_to, lent_until, accessories                  │  │
│  │  ├─ unit_price                                         │  │
│  │  ├─ created_at, updated_at                             │  │
│  │  └─ (weitere Felder)                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Datenfluss-Diagramm

```
1. DATA LOADING PHASE
═════════════════════════════════════════
   Supabase
      ↓
   fetch inventory_items
      ↓
   InventoryItem[] geladen
      ↓
   useInventory Hook speichert in State
      ↓
   allItems State aktualisiert

2. PROCESSING PHASE
═════════════════════════════════════════
   useDMXPatchplan Hook triggered (via useMemo)
      ↓
   Filter Items mit dmx_start_address & dmx_channels
      ↓
   Für jedes Item: calculateInstanceAddresses()
      ├─ Berechne Adressen für all Instanzen
      ├─ Instance 1: startAddr + (0 × channels)
      ├─ Instance 2: startAddr + (1 × channels)
      └─ Instance N: startAddr + ((N-1) × channels)
      ↓
   Erstelle PatchplanRow[] → sortiert nach Universe + Adresse
      ↓
   Conflict Detection: findConflicts()
      ├─ For each pair: Prüfe auf Overlap
      ├─ if start1 ≤ end2 AND start2 ≤ end1: CONFLICT
      └─ DMXConflict[] zurückgeben
      ↓
   Universe Usage: calculateUniverseUsage()
      ├─ For each Universe: max(endAddress)
      └─ Record<number, number> zurückgeben

3. RENDERING PHASE
═════════════════════════════════════════
   React Components erhalten Props
      ├─ patchplan: PatchplanRow[]
      ├─ conflicts: DMXConflict[]
      └─ universeUsage: Record<number, number>
      ↓
   DMXTimeline Component
      ├─ Gruppiere nach Universe
      ├─ Render visuelle Timeline
      └─ Render Detail-Listen
      ↓
   DMXPatchplanTable Component
      ├─ Render Tabelle
      ├─ Inline-Edit vorbereiten
      └─ Buttons für Aktionen
      ↓
   UI aktualisiert im Browser

4. USER INTERACTION PHASE
═════════════════════════════════════════
   User klickt auf eine Adresse → Edit Mode
      ↓
   Input wird validiert
      ├─ Zwischen 1-512?
      ├─ Genug Platz?
      └─ Keine Konflikte?
      ↓
   updateItemDMXAddress() aufgerufen
      ↓
   updateItem() in useInventory Hook
      ↓
   Supabase UPDATE Query
      ↓
   Lokaler State aktualisiert
      ↓
   ZURÜCK ZUR PROCESSING PHASE
      (Patchplan wird neu berechnet)

5. FEEDBACK PHASE
═════════════════════════════════════════
   Toast-Nachricht
      ├─ Erfolgreich: "DMX-Adresse aktualisiert"
      └─ Fehler: "Zu viele Kanäle!"
      ↓
   UI aktualisiert mit neuem Patchplan
      ↓
   Konflikte? Neu gefärbt (rot)
      ↓
   Cycle abgeschlossen ✓
```

---

## Component-Hierarchie

```
DMXPatchplan (Page)
│
├─ Props:
│  └─ (keine - liest von Hooks)
│
├─ Hooks:
│  ├─ useInventory() → allItems, updateItem, loading
│  └─ useDMXPatchplan() → patchplan, conflicts, universeUsage
│
├─ State:
│  ├─ viewMode: 'table' | 'timeline'
│  └─ hoveredRowId: string | null
│
└─ Children:
   ├─ Header Section
   │  ├─ Title
   │  ├─ Buttons (Timeline/Table/Export)
   │  └─ Universe Usage Cards
   │
   ├─ Conflict Alert
   │  └─ (wenn conflicts.length > 0)
   │
   └─ Content Area
      ├─ IF viewMode === 'timeline':
      │  └─ DMXTimeline
      │     ├─ Props:
      │     │  ├─ rows: PatchplanRow[]
      │     │  ├─ conflicts: DMXConflict[]
      │     │  ├─ onRowHover: (row) => void
      │     │  └─ hoveredRowId: string | null
      │     │
      │     └─ Children (für jedes Universe):
      │        ├─ Timeline Bar (SVG/Div)
      │        └─ Detailed List
      │
      └─ IF viewMode === 'table':
         └─ DMXPatchplanTable
            ├─ Props:
            │  ├─ rows: PatchplanRow[]
            │  ├─ conflicts: DMXConflict[]
            │  ├─ onAddressChange: async
            │  ├─ onUniverseChange: async
            │  ├─ onAutoAssign: async
            │  └─ loading: boolean
            │
            └─ Children (Table):
               ├─ TableHeader
               └─ TableBody
                  └─ (für jede row):
                     ├─ Gerät-Name
                     ├─ Instanz-Info
                     ├─ Universe
                     ├─ Editierbare Adresse
                     ├─ End-Adresse
                     ├─ Kanäle
                     ├─ Standort
                     ├─ Status-Badge
                     └─ Action Buttons
```

---

## Algorithmen

### Algorithm 1: Instance Address Calculation

```typescript
function calculateInstanceAddresses(
  item: InventoryItem,
  startingAddress: number,
  universe: number
): PatchedInstance[] {
  
  const instances = []
  
  for (let i = 1; i <= item.quantity; i++) {
    // Berechne Start für diese Instanz
    const startAddr = startingAddress + (i - 1) * item.dmx_channels
    const endAddr = startAddr + item.dmx_channels - 1
    
    // Sicherheit: nicht über 512 hinaus
    if (startAddr > 512) {
      warn(`Overflow in universe ${universe}`)
      continue
    }
    
    instances.push({
      instanceNumber: i,
      startAddress: startAddr,
      endAddress: Math.min(endAddr, 512),
      channels: item.dmx_channels
    })
  }
  
  return instances
}

COMPLEXITY: O(n) wobei n = quantity
```

### Algorithm 2: Conflict Detection

```typescript
function findConflicts(rows: PatchplanRow[]): DMXConflict[] {
  const conflicts = []
  
  // Nested Loop: Vergleiche jedes Paar
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const row1 = rows[i]
      const row2 = rows[j]
      
      // Nur gleiche Universe prüfen
      if (row1.universe !== row2.universe) continue
      
      // Test auf Overlap:
      // Überschneide wenn:
      // start1 ≤ end2  UND  start2 ≤ end1
      if (row1.startAddress <= row2.endAddress &&
          row2.startAddress <= row1.endAddress) {
        conflicts.push({ row1, row2, universe: row1.universe })
      }
    }
  }
  
  return conflicts
}

COMPLEXITY: O(n²) wobei n = Anzahl Rows
(Aber praktisch OK, da n selten > 100)
```

### Algorithm 3: Next Available Channel Search

```typescript
function findNextAvailableChannel(
  rows: PatchplanRow[],
  universe: number,
  startSearchFrom: number = 1
): number {
  
  // Sammle alle belegten Kanäle
  const usedChannels = new Set<number>()
  
  rows
    .filter(r => r.universe === universe)
    .forEach(row => {
      for (let ch = row.startAddress; ch <= row.endAddress; ch++) {
        usedChannels.add(ch)
      }
    })
  
  // Finde erste freie Lücke
  for (let ch = startSearchFrom; ch <= 512; ch++) {
    if (!usedChannels.has(ch)) {
      return ch  // Gefunden!
    }
  }
  
  return -1  // Keine Lücke gefunden
}

COMPLEXITY: O(n·m) wobei:
  n = Anzahl Rows
  m = durchschnittliche Kanäle pro Row
Praktisch: O(512) = O(1)
```

---

## State Management Details

### useInventory Hook State

```typescript
const [items, setItems] = useState<InventoryItem[]>([])
const [loading, setLoading] = useState(true)
const [searchQuery, setSearchQuery] = useState('')
const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all')
const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all')
const [locationFilter, setLocationFilter] = useState<string>('all')

// Computed States (memoized)
const filteredItems = useMemo(() => { /* filtering logic */ }, [...filters])
const locations = useMemo(() => { /* unique locations */ }, [items])
const stats = useMemo(() => { /* calculations */ }, [items])
```

### useDMXPatchplan Hook State

```typescript
// Keine direkter State - alles memoized!
const patchplan = useMemo(() => generatePatchplan(allItems), [allItems])
const conflicts = useMemo(() => findConflicts(patchplan), [patchplan])
const universeUsage = useMemo(() => calculateUniverseUsage(patchplan), [patchplan])
const patchplanByUniverse = useMemo(() => { /* grouping */ }, [patchplan])

// Callbacks (stable references)
const updateItemDMXAddress = useCallback(async (itemId, newAddr) => { ... }, [...deps])
const updateItemDMXUniverse = useCallback(async (itemId, newUni) => { ... }, [...deps])
const autoAssignNextAvailable = useCallback(async (itemId, uni) => { ... }, [...deps])
```

---

## Type System

```typescript
// Core Types (types/inventory.ts)
interface InventoryItem {
  id: string
  user_id: string
  name: string
  category: ItemCategory
  quantity: number
  condition: ItemCondition
  location: string
  notes?: string | null
  lent_to?: string | null
  lent_until?: string | null
  accessories?: string | null
  dmx_start_address?: number | null      ← DMX-Felder
  dmx_channels?: number | null           ← DMX-Felder
  dmx_universe?: number | null           ← DMX-Felder
  unit_price?: number | null
  created_at: string
  updated_at: string
}

// DMX-spezifische Types (lib/dmxPatchplan.ts)
interface PatchplanRow {
  id: string                    // item-id-instanceNumber
  itemId: string
  itemName: string
  instanceNumber: number        // 1, 2, 3, ...
  totalInstances: number        // quantity
  universe: number              // 1, 2, 3, ...
  startAddress: number          // 1-512
  endAddress: number            // startAddress + channels - 1
  channels: number              // channels per instance
  condition: string
  location: string
}

interface DMXConflict {
  row1: PatchplanRow
  row2: PatchplanRow
  universe: number
}

interface PatchedInstance {
  instanceNumber: number
  startAddress: number
  endAddress: number
  channels: number
}
```

---

## Performance-Optimierungen

### 1. Memoization Strategy

```typescript
// DMXPatchplan Page
const patchplan = useMemo(() => generatePatchplan(allItems), [allItems])
// → Nur neu berechnet wenn allItems sich ändert

const conflicts = useMemo(() => findConflicts(patchplan), [patchplan])
// → Nur neu berechnet wenn patchplan sich ändert

const universeUsage = useMemo(() => calculateUniverseUsage(patchplan), [patchplan])
// → Nur neu berechnet wenn patchplan sich ändert
```

### 2. Component Rendering

```typescript
// DMXTimeline - List Virtualization nicht nötig
// (Typikal: < 100 Rows)

// DMXPatchplanTable - Optimiert für große Tabellen
// Einzelne TableRows rendern unabhängig
```

### 3. Query-Optimierung

```typescript
// Supabase Query
const { data } = await supabase
  .from('inventory_items')
  .select('*')  // Alle Felder laden
  .order('created_at', { ascending: false })

// Nicht optimal aber OK für kleine Datasets
// Bei Wachstum: Selective Select nutzen
```

---

## Error Handling Strategy

```
User Input
    ↓
Validation Layer 1: Frontend
├─ Bereich 1-512?
├─ Typ korrekt?
└─ Pflichtfelder gefüllt?
    ↓
Validation Layer 2: Business Logic
├─ Genug Platz?
├─ Keine Konflikte?
└─ Universität valid?
    ↓
Supabase Update
    ↓
Error Handling
├─ Success: Toast "Erfolgreich"
└─ Error: Toast "Fehler: ..."
    ↓
User Feedback
```

---

## Skalierbarkeit

### Aktuelle Limits

| Metrik | Limit | Notizen |
|--------|-------|---------|
| Items | ~1000 | Vor Optimierung |
| DMX Items | ~500 | Patchplan wird langsam |
| Rows | ~5000 | Bei 512ch/Item × Menge |
| Universe | Unbegrenzt | Praktisch: 1-4 |

### Scaling Strategy

Bei Bedarf:
1. **Pagination** für Tabelle
2. **Virtual Scrolling** für große Listen
3. **Database Indexing** auf dmx_*
4. **Selective Queries** in Supabase
5. **Caching** von Patchplan-Ergebnissen

---

Diese Architektur ist modular, testbar und erweiterbar.
