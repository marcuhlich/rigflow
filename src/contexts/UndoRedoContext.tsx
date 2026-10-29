import { createContext, useContext, ReactNode, useState, useCallback, useMemo } from "react";

interface UndoRedoContextType {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: (() => void) | null;
  onRedo: (() => void) | null;
  register: (handlers: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void }) => void;
  unregister: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextType>({
  canUndo: false,
  canRedo: false,
  onUndo: null,
  onRedo: null,
  register: () => {},
  unregister: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export function useUndoRedoContext() {
  return useContext(UndoRedoContext);
}

export function UndoRedoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    canUndo: boolean;
    canRedo: boolean;
    onUndo: (() => void) | null;
    onRedo: (() => void) | null;
  }>({ canUndo: false, canRedo: false, onUndo: null, onRedo: null });

  const register = useCallback((handlers: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void }) => {
    setState(handlers);
  }, []);

  const unregister = useCallback(() => {
    setState({ canUndo: false, canRedo: false, onUndo: null, onRedo: null });
  }, []);

  // Stable value → consumers only re-render when the registered state actually changes
  const value = useMemo(() => ({ ...state, register, unregister }), [state, register, unregister]);

  return (
    <UndoRedoContext.Provider value={value}>
      {children}
    </UndoRedoContext.Provider>
  );
}
