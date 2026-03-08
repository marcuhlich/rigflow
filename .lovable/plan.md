

# Implementierungsplan: Bugfixes + Verbesserungen

## 1. Bug: SetForm State-Reset (EventSets.tsx)
`useEffect` hinzufuegen das bei Aenderung von `initial` alle Formularfelder aktualisiert:
```ts
useEffect(() => {
  setName(initial?.name || "");
  setDesc(initial?.description || "");
  setDateStart(initial?.dateStart ? new Date(initial.dateStart) : undefined);
  setDateEnd(initial?.dateEnd ? new Date(initial.dateEnd) : undefined);
  setNotes(initial?.notes || "");
}, [initial]);
```

## 2. Bug: ImageUpload Remove-Button auf Mobile unsichtbar
Aendern von `opacity-0 group-hover:opacity-100` zu immer sichtbar mit leichtem Hintergrund:
```
className="absolute top-1 right-1 h-7 w-7 p-0"
```
Kein Hover-Gate mehr -- Button ist immer sichtbar.

## 3. Bug: ItemDetail stale data nach Edit
Statt sofort `items.find()` aufzurufen (was noch alte Daten hat), einfach den Dialog schliessen und auf den naechsten Render via `useEffect[id, items]` warten -- das aktualisiert automatisch.

## 4. Bug: OverdueReminder stale closure
`checkOverdue` in `useCallback` wrappen mit korrekten Dependencies, dann in `useEffect` dependency array aufnehmen.

## 5. Verbesserung: Lending-Historie auf ItemDetail
Neuer Abschnitt "Verleih-Historie" auf der Item-Detailseite. Nutzt `useLendingHistory().getItemHistory(id)` um vergangene und aktive Leihvorgaenge anzuzeigen.

## 6. Verbesserung: Dashboard Lending-Daten
Dashboard um echte `lending_history`-Daten erweitern: Aktive Ausleihen und ueberfaellige Rueckgaben aus der Lending-Tabelle statt nur aus dem Inventar-Status.

---

## Dateien die geaendert werden

| Datei | Aenderung |
|---|---|
| `src/pages/EventSets.tsx` | useEffect fuer State-Reset in SetForm |
| `src/components/ImageUpload.tsx` | Remove-Button immer sichtbar |
| `src/pages/ItemDetail.tsx` | Stale-data Fix + Lending-Historie Sektion |
| `src/hooks/useOverdueReminder.ts` | useCallback + useEffect deps |
| `src/pages/Dashboard.tsx` | Lending-Daten aus useLendingHistory integrieren |

