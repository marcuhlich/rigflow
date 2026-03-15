import { createContext, useContext, ReactNode, useState, useCallback } from "react";

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

  return (
    <UndoRedoContext.Provider value={{ ...state, register, unregister }}>
      {children}
    </UndoRedoContext.Provider>
  );
}
