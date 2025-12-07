/**
 * Input-Validierungs-Utilities
 * Zentralisierte Validierungslogik für alle Formulare
 */

export const validators = {
  /**
   * Validiere DMX-Adresse (1-512)
   */
  dmxAddress: (value: string | number): { valid: boolean; error?: string } => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    
    if (isNaN(num)) {
      return { valid: false, error: 'DMX-Adresse muss eine Zahl sein' };
    }
    if (num < 1) {
      return { valid: false, error: 'DMX-Adresse muss mindestens 1 sein' };
    }
    if (num > 512) {
      return { valid: false, error: 'DMX-Adresse darf maximal 512 sein' };
    }
    return { valid: true };
  },

  /**
   * Validiere DMX-Adressbereich
   */
  dmxAddressRange: (
    start: string | number,
    end: string | number
  ): { valid: boolean; error?: string } => {
    const startNum = typeof start === 'string' ? parseInt(start, 10) : start;
    const endNum = typeof end === 'string' ? parseInt(end, 10) : end;

    const startValid = validators.dmxAddress(startNum);
    if (!startValid.valid) {
      return { valid: false, error: `Start: ${startValid.error}` };
    }

    const endValid = validators.dmxAddress(endNum);
    if (!endValid.valid) {
      return { valid: false, error: `End: ${endValid.error}` };
    }

    if (endNum < startNum) {
      return { 
        valid: false, 
        error: 'End-Adresse muss größer oder gleich Start-Adresse sein' 
      };
    }

    const range = endNum - startNum + 1;
    if (range > 512) {
      return { 
        valid: false, 
        error: `Range zu groß: ${range} Kanäle (max 512)` 
      };
    }

    return { valid: true };
  },

  /**
   * Validiere Kanäle (1-512)
   */
  dmxChannels: (value: string | number): { valid: boolean; error?: string } => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    
    if (isNaN(num)) {
      return { valid: false, error: 'Kanäle müssen eine Zahl sein' };
    }
    if (num < 1) {
      return { valid: false, error: 'Kanäle müssen mindestens 1 sein' };
    }
    if (num > 512) {
      return { valid: false, error: 'Kanäle dürfen maximal 512 sein' };
    }
    return { valid: true };
  },

  /**
   * Validiere Quantity
   */
  quantity: (value: string | number): { valid: boolean; error?: string } => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    
    if (isNaN(num)) {
      return { valid: false, error: 'Menge muss eine Zahl sein' };
    }
    if (num < 1) {
      return { valid: false, error: 'Menge muss mindestens 1 sein' };
    }
    if (num > 9999) {
      return { valid: false, error: 'Menge darf maximal 9999 sein' };
    }
    return { valid: true };
  },

  /**
   * Validiere Text-Feld (nicht leer)
   */
  text: (value: string, minLength = 1, maxLength = 255): { valid: boolean; error?: string } => {
    if (!value || value.trim().length === 0) {
      return { valid: false, error: 'Dieses Feld ist erforderlich' };
    }
    if (value.length < minLength) {
      return { valid: false, error: `Mindestens ${minLength} Zeichen erforderlich` };
    }
    if (value.length > maxLength) {
      return { valid: false, error: `Maximal ${maxLength} Zeichen erlaubt` };
    }
    return { valid: true };
  },

  /**
   * Validiere Email
   */
  email: (value: string): { valid: boolean; error?: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!value || value.trim().length === 0) {
      return { valid: false, error: 'Email-Adresse erforderlich' };
    }
    if (!emailRegex.test(value)) {
      return { valid: false, error: 'Ungültige Email-Adresse' };
    }
    return { valid: true };
  },

  /**
   * Validiere UUID
   */
  uuid: (value: string): { valid: boolean; error?: string } => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!value) {
      return { valid: false, error: 'UUID erforderlich' };
    }
    if (!uuidRegex.test(value)) {
      return { valid: false, error: 'Ungültige UUID-Format' };
    }
    return { valid: true };
  },

  /**
   * Validiere Universe (1-500)
   */
  universe: (value: string | number): { valid: boolean; error?: string } => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    
    if (isNaN(num)) {
      return { valid: false, error: 'Universe muss eine Zahl sein' };
    }
    if (num < 1) {
      return { valid: false, error: 'Universe muss mindestens 1 sein' };
    }
    if (num > 500) {
      return { valid: false, error: 'Universe darf maximal 500 sein' };
    }
    return { valid: true };
  },
};

/**
 * Sichere Konvertierung zu Integer
 */
export const toSafeInt = (value: string | number, min = 0, max = Infinity): number | null => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num)) return null;
  if (num < min || num > max) return null;
  
  return num;
};

/**
 * Sichere Konvertierung zu Float
 */
export const toSafeFloat = (value: string | number, min = -Infinity, max = Infinity): number | null => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return null;
  if (num < min || num > max) return null;
  
  return num;
};

/**
 * Trim und normalisiere Text
 */
export const normalizeText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ');
};

/**
 * Validiere und normalisiere Item-Name
 */
export const normalizeItemName = (name: string): { value: string; error?: string } => {
  const normalized = normalizeText(name);
  const validation = validators.text(normalized, 1, 100);
  
  if (!validation.valid) {
    return { value: '', error: validation.error };
  }
  
  return { value: normalized };
};
