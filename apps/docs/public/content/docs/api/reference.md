---
title: "API Referenz"
description: "RigFlow REST API Dokumentation"
---

# API Referenz

Die RigFlow API ermöglicht dir den programmatischen Zugriff auf alle Funktionen.

## Authentifizierung

Alle API-Anfragen benötigen einen Bearer Token:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.rigflow.app/v1/items
```

## Endpoints

### Items

#### Alle Items abrufen

```http
GET /v1/items
```

**Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `category` | string | Nach Kategorie filtern |
| `status` | string | Nach Status filtern |
| `limit` | number | Anzahl der Ergebnisse |
| `offset` | number | Pagination Offset |

**Beispiel-Antwort:**

```json
{
  "data": [
    {
      "id": "cam-001",
      "name": "Sony A7IV",
      "category": "cameras",
      "status": "available",
      "location": "warehouse-a"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### Item erstellen

```http
POST /v1/items
```

```json
{
  "name": "Canon RF 50mm f/1.2",
  "category": "lenses",
  "serial_number": "ABC123456",
  "purchase_date": "2024-01-15"
}
```

### QR-Codes

#### QR-Code generieren

```http
POST /v1/items/:id/qr
```

**Parameter:**

| Parameter | Typ | Standard |
|-----------|-----|---------|
| `format` | svg, png, pdf | svg |
| `size` | number | 256 |

## Rate Limits

- **Free Plan:** 100 Requests/Minute
- **Pro Plan:** 1.000 Requests/Minute
- **Enterprise:** Unbegrenzt

## SDKs

```bash
# JavaScript/TypeScript
npm install @rigflow/sdk

# Python
pip install rigflow

# Go
go get github.com/rigflow/go-sdk
```
