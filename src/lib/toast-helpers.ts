import { useToast } from "@/hooks/use-toast";

type ToastFunction = ReturnType<typeof useToast>['toast'];

/**
 * Zentralisierte Toast-Fehlerbehandlung
 * Verhindert Code-Duplikation und sorgt für konsistente Error-Meldungen
 */
export const createErrorHandler = (toast: ToastFunction) => {
  return {
    /**
     * Fehler beim Laden von Ressourcen
     */
    loadFailed: (resource: string, details?: string) => {
      toast({
        title: `${resource} konnte nicht geladen werden`,
        description: details || 'Prüfe deine Internetverbindung.',
        variant: "destructive",
      });
    },

    /**
     * Fehler beim Speichern von Daten
     */
    saveFailed: (resource: string, details?: string) => {
      toast({
        title: `${resource} konnte nicht gespeichert werden`,
        description: details || 'Prüfe deine Eingaben und versuche es erneut.',
        variant: "destructive",
      });
    },

    /**
     * Netzwerkfehler (generisch)
     */
    network: (details?: string) => {
      toast({
        title: "Netzwerkfehler",
        description: details || "Prüfe deine Internetverbindung.",
        variant: "destructive",
      });
    },

    /**
     * Allgemeiner Fehler
     */
    generic: (message: string, details?: string) => {
      toast({
        title: "Fehler",
        description: details || message,
        variant: "destructive",
      });
    },

    /**
     * Validierungsfehler
     */
    validation: (field: string, message: string) => {
      toast({
        title: `Ungültige Eingabe: ${field}`,
        description: message,
        variant: "destructive",
      });
    },

    /**
     * Authorisierungsfehler
     */
    auth: (message?: string) => {
      toast({
        title: "Authentifizierung erforderlich",
        description: message || "Bitte melde dich an.",
        variant: "destructive",
      });
    },

    /**
     * Berechtigungsfehler
     */
    forbidden: (resource?: string) => {
      toast({
        title: "Zugriff verweigert",
        description: resource 
          ? `Du hast keine Berechtigung auf ${resource} zuzugreifen.`
          : "Du hast keine Berechtigung für diese Aktion.",
        variant: "destructive",
      });
    },

    /**
     * Ressource nicht gefunden
     */
    notFound: (resource: string) => {
      toast({
        title: `${resource} nicht gefunden`,
        description: "Die angeforderte Ressource existiert nicht.",
        variant: "destructive",
      });
    },

    /**
     * Allgemeiner Error-Handler (extrahiert Message wenn möglich)
     */
    handleError: (error: unknown, defaultMessage = "Ein Fehler ist aufgetreten") => {
      let message = defaultMessage;

      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }

      // Prüfe auf spezifische Fehlermuster
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('network')) {
        return toast({
          title: "Netzwerkfehler",
          description: message,
          variant: "destructive",
        });
      }
      if (lowerMessage.includes('unauthorized')) {
        return toast({
          title: "Authentifizierung erforderlich",
          description: message,
          variant: "destructive",
        });
      }
      if (lowerMessage.includes('forbidden')) {
        return toast({
          title: "Zugriff verweigert",
          description: message,
          variant: "destructive",
        });
      }

      return toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    },
  };
};

/**
 * Success Toast Messages
 */
export const createSuccessHandler = (toast: ToastFunction) => {
  return {
    saved: (resource: string) => {
      toast({
        title: "Erfolg",
        description: `${resource} wurde gespeichert.`,
      });
    },

    created: (resource: string) => {
      toast({
        title: "Erstellt",
        description: `${resource} wurde erfolgreich erstellt.`,
      });
    },

    deleted: (resource: string) => {
      toast({
        title: "Gelöscht",
        description: `${resource} wurde gelöscht.`,
      });
    },

    updated: (resource: string) => {
      toast({
        title: "Aktualisiert",
        description: `${resource} wurde aktualisiert.`,
      });
    },

    copied: (text: string = "Text") => {
      toast({
        title: "Kopiert",
        description: `${text} wurde in die Zwischenablage kopiert.`,
      });
    },

    generic: (message: string) => {
      toast({
        title: "Erfolg",
        description: message,
      });
    },
  };
};

/**
 * Info/Warning Toast Messages
 */
export const createInfoHandler = (toast: ToastFunction) => {
  return {
    info: (title: string, description?: string) => {
      toast({
        title,
        description,
      });
    },

    warning: (title: string, description?: string) => {
      toast({
        title,
        description,
        variant: "default",
      });
    },

    loading: (message: string) => {
      toast({
        title: "Laden...",
        description: message,
      });
    },
  };
};

/**
 * Combined Handler - Alles in einem
 * Usage: const handlers = createToastHandlers(toast);
 */
export const createToastHandlers = (toast: ToastFunction) => ({
  errors: createErrorHandler(toast),
  success: createSuccessHandler(toast),
  info: createInfoHandler(toast),
});

// Type exports für bessere Autocomplete
export type ErrorHandler = ReturnType<typeof createErrorHandler>;
export type SuccessHandler = ReturnType<typeof createSuccessHandler>;
export type InfoHandler = ReturnType<typeof createInfoHandler>;
export type ToastHandlers = ReturnType<typeof createToastHandlers>;
