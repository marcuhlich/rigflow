# Rigflow – Anleitung & Quick Start Guide

## Willkommen

Rigflow ist eine Inventar-App für Veranstaltungstechniker. Sie hilft dir, dein Equipment zu verwalten, Ausleihen zu tracken, DMX-Adressen zu planen und Events vorzubereiten. Diese Anleitung erklärt alle Funktionen Schritt für Schritt.

---

## Aufbau der App

Die App besteht aus folgenden Hauptbereichen, erreichbar über die Seitenleiste:

- **Dashboard** – Übersicht mit Statistiken, aktiven Ausleihen und letzten Aktivitäten
- **Inventar** – Alle Geräte verwalten, filtern, exportieren
- **Verleih** – Ausleihen erstellen, verwalten und Rückgaben tracken
- **Checklisten** – Vor- und Nachbereitungs-Listen für Events
- **Event-Sets** – Packlisten für bestimmte Veranstaltungen
- **DMX-Patchplan** – DMX-Adressen planen und Konflikte erkennen
- **Einstellungen** – Konto verwalten, Passwort ändern, Account löschen

---

## 📦 Inventar

### Gerät hinzufügen
1. Öffne die Seite **Inventar**
2. Klicke auf **+ Neues Item**
3. Fülle die Felder aus: Name, Kategorie, Menge, Standort, Zustand, Stückpreis, Notizen
4. Optional: DMX-Daten (Universe, Startadresse, Kanalanzahl) angeben
5. Klicke auf **Hinzufügen**

### Gerät bearbeiten & löschen
- Klicke auf **Edit** beim jeweiligen Gerät, um die Daten zu ändern
- Klicke auf **Löschen**, um ein Gerät unwiderruflich zu entfernen

### Filtern & Suchen
- Nutze die **Suchleiste** oben, um nach Namen zu suchen
- Filtere nach **Kategorie**, **Zustand** oder **Standort**
- Alle Filter lassen sich kombinieren

### Batch-Operationen
- Aktiviere den **Auswahl-Modus** über das Auswahl-Icon
- Wähle mehrere Geräte aus
- Führe Batch-Aktionen wie Löschen durch

### Export & Druck
- Klicke auf den **Export**-Button in der Befehlsleiste
- Wähle zwischen **CSV** und **PDF**
- Nutze **Drucken** für eine druckoptimierte Ansicht

### Geräte-Detailseite
- Klicke auf ein Gerät, um die Detailseite zu öffnen
- Dort siehst du alle Infos, den QR-Code, Zubehör und die Verleih-Historie

---

## 🔲 QR-Codes

Jedes Gerät bekommt automatisch einen QR-Code, der direkt zur Detailseite führt.

### QR-Code anzeigen & nutzen
1. Klicke auf **QR** beim jeweiligen Gerät
2. **Herunterladen** – Speichert den QR-Code als Bild
3. **Drucken** – Druckt den QR-Code direkt aus (z.B. für Etiketten)

### QR-Code scannen
1. Klicke auf **QR scannen** in der Inventar-Befehlsleiste
2. Erlaube den Kamerazugriff
3. Halte den QR-Code vor die Kamera
4. Du wirst automatisch zur Detailseite des Geräts weitergeleitet

> **Tipp:** Das Scannen funktioniert auch offline!

---

## 🤝 Verleih

### Neue Ausleihe erstellen
1. Öffne die Seite **Verleih**
2. Klicke auf **+ Neue Ausleihe**
3. Wähle das Gerät aus, gib den Namen des Ausleihenden und das Fälligkeitsdatum an
4. Klicke auf **Erstellen**

### Rückgabe verbuchen
- Klicke bei einer aktiven Ausleihe auf den **Rückgabe**-Button
- Die Ausleihe wird als zurückgegeben markiert und in der Historie gespeichert

### Überfällige Ausleihen
- Überfällige Rückgaben werden rot hervorgehoben
- Du erhältst automatische Erinnerungen bei überfälligen Ausleihen

### Verleih-Historie
- Im Tab **Historie** siehst du alle abgeschlossenen Ausleihen
- Auf der Geräte-Detailseite wird ebenfalls die Verleih-Historie des jeweiligen Geräts angezeigt

---

## 📋 Checklisten

### Checkliste erstellen
1. Öffne die Seite **Checklisten**
2. Klicke auf **+ Neue Checkliste**
3. Gib einen Event-Namen, Typ (Aufbau, Abbau, Wartung) und optionale Beschreibung ein
4. Füge Punkte hinzu, die abgehakt werden sollen

### Punkte abhaken
- Klicke auf einen Punkt, um ihn als erledigt zu markieren
- Der Fortschritt wird als Balken angezeigt

### Typen
- **Aufbau** – Checkliste für den Event-Aufbau
- **Abbau** – Checkliste für den Event-Abbau
- **Wartung** – Checkliste für Wartungsarbeiten

---

## 📁 Event-Sets (Packlisten)

### Event-Set erstellen
1. Öffne die Seite **Event-Sets**
2. Klicke auf **+ Neues Set**
3. Gib Name, Beschreibung, Zeitraum und Notizen ein
4. Füge Artikel aus dem Inventar hinzu und lege Mengen fest

### Packliste exportieren
- Klicke auf **PDF exportieren**, um eine druckbare Packliste zu erstellen
- Die Liste enthält Artikelname, Kategorie, Standort, Menge und Verfügbarkeit

### Favoriten
- Markiere häufig genutzte Sets als Favorit für schnellen Zugriff

---

## 🎛️ DMX-Patchplan

### Übersicht
Der DMX-Patchplan zeigt alle Geräte mit DMX-Konfiguration und ihre Adressbelegung.

### Ansichten
- **Timeline** – Grafische Darstellung der Adressbelegung pro Universe
- **Tabelle** – Tabellarische Übersicht aller Zuweisungen

### Konflikte
- Überlappende DMX-Adressen werden automatisch erkannt
- Konflikte werden als Warnung mit den betroffenen Geräten angezeigt

### DMX-Daten bearbeiten
- DMX-Adressen (Universe, Startadresse, Kanäle) werden beim Gerät im Inventar konfiguriert
- Für mehrere Instanzen eines Geräts können separate DMX-Adressen vergeben werden

### Export
- **CSV** und **PDF** Export über das Export-Menü
- **Drucken** für eine druckoptimierte Ansicht mit Universe-Gruppierung

---

## 📊 Dashboard

Das Dashboard zeigt dir auf einen Blick:
- **Gesamt-Artikel** und **Gesamtwert** deines Inventars
- **Aktive Ausleihen** mit Fälligkeitsdaten
- **Überfällige Rückgaben** als Warnung
- **Letzte Aktivitäten** aus der Verleih-Historie
- **Kategorieverteilung** als Diagramm

---

## ⚙️ Einstellungen

### Konto
- **Anzeigename** ändern
- **Passwort** zurücksetzen (per E-Mail)
- **Account löschen** (unwiderruflich, erfordert E-Mail-Bestätigung)
- **Abmelden**

---

## 📱 PWA – Als App installieren

Rigflow kann als App auf deinem Gerät installiert werden:
1. Öffne die App im Browser
2. Folge den Anweisungen auf der **Installieren**-Seite
3. Die App erscheint auf deinem Homescreen und funktioniert wie eine native App

> **Tipp:** Die App funktioniert auch bei schlechter Internetverbindung. Ein Offline-Indikator zeigt dir an, wenn du offline bist.

---

## 💡 Tipps

- **Tastenkombinationen:** Nutze die Suchleiste für schnellen Zugriff auf Geräte
- **QR-Codes drucken:** Drucke QR-Codes auf Etiketten und klebe sie direkt auf deine Geräte
- **Regelmäßige Wartung:** Nutze Wartungs-Checklisten, um den Zustand deiner Geräte im Blick zu behalten
- **Event-Vorbereitung:** Erstelle Event-Sets mit Packlisten, bevor du zum Gig fährst
- **Verleih tracken:** Nutze die Verleihverwaltung, um nie wieder vergessene Rückgaben zu haben
