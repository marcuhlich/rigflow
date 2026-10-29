/**
 * Strukturiertes Logging für besseres Debugging
 * Alle Logs folgen einheitlichem Format: [Component] Action: Message
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
}

// Speichere letzte 100 Logs im Memory (für Debugging)
const logHistory: LogEntry[] = [];
const MAX_HISTORY = 100;

const getTimestamp = () => new Date().toISOString();

const addToHistory = (entry: LogEntry) => {
  logHistory.push(entry);
  if (logHistory.length > MAX_HISTORY) {
    logHistory.shift();
  }
};

/** JSON.stringify that never throws (circular structures, BigInt, ...) - logging must not crash callers. */
const safeStringify = (data: unknown): string => {
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(data, (_key, value) => {
      if (typeof value === 'bigint') return value.toString();
      if (value instanceof Error) return { name: value.name, message: value.message };
      if (value && typeof value === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    }) ?? String(data);
  } catch {
    return String(data);
  }
};

const formatLog = (component: string, message: string, data?: unknown) => {
  const dataStr = data !== undefined && data !== null && data !== '' ? ` | ${safeStringify(data)}` : '';
  return `[${component}] ${message}${dataStr}`;
};

export const logger = {
  /**
   * Info-Level Logs
   */
  info: (component: string, message: string, data?: unknown) => {
    const entry: LogEntry = {
      timestamp: getTimestamp(),
      level: 'info',
      component,
      message,
      data,
    };
    addToHistory(entry);
    console.log(`ℹ️  ${formatLog(component, message, data)}`);
  },

  /**
   * Warning-Level Logs
   */
  warn: (component: string, message: string, data?: unknown) => {
    const entry: LogEntry = {
      timestamp: getTimestamp(),
      level: 'warn',
      component,
      message,
      data,
    };
    addToHistory(entry);
    console.warn(`⚠️  ${formatLog(component, message, data)}`);
  },

  /**
   * Error-Level Logs (mit Stack-Trace)
   */
  error: (component: string, message: string, error?: unknown, data?: unknown) => {
    // Supabase PostgrestError is a plain object with `message` - don't log it as "[object Object]"
    const errorMessage = error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    const logData: Record<string, unknown> = { 
      originalError: errorMessage,
    };
    
    if (data && typeof data === 'object') {
      Object.assign(logData, data);
    }
    
    const entry: LogEntry = {
      timestamp: getTimestamp(),
      level: 'error',
      component,
      message,
      data: logData,
    };
    addToHistory(entry);
    
    console.error(
      `❌ ${formatLog(component, message, data)}`,
      error,
      errorStack ? `\n${errorStack}` : ''
    );

    // Optional: An Error-Tracking Service senden (z.B. Sentry)
    // trackError({ component, message, error, data });
  },

  /**
   * Debug-Level Logs (nur in Development)
   */
  debug: (component: string, message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      const entry: LogEntry = {
        timestamp: getTimestamp(),
        level: 'debug',
        component,
        message,
        data,
      };
      addToHistory(entry);
      console.debug(`🐛 ${formatLog(component, message, data)}`);
    }
  },

  /**
   * Get all logged entries (für Debugging)
   */
  getHistory: () => [...logHistory],

  /**
   * Exportiere Logs für Bug-Reports
   */
  exportLogs: () => {
    return JSON.stringify(logHistory, null, 2);
  },

  /**
   * Clear log history
   */
  clearHistory: () => {
    logHistory.length = 0;
  },
};

// Globale Error Handler (registered once, even if the module is re-evaluated by HMR)
const GLOBAL_HANDLERS_FLAG = '__rigflowLoggerHandlers__';
const globalScope = window as Window & { [GLOBAL_HANDLERS_FLAG]?: boolean };
if (!globalScope[GLOBAL_HANDLERS_FLAG]) {
  globalScope[GLOBAL_HANDLERS_FLAG] = true;

  window.addEventListener('error', (event) => {
    logger.error('GlobalErrorHandler', 'Uncaught Error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('GlobalErrorHandler', 'Unhandled Promise Rejection', event.reason);
  });
}

export default logger;
