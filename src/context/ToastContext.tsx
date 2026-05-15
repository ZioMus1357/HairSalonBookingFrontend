import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadow } from "../theme/tokens";

type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: "success" | "error" | "info";
};

type ToastState = {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastState | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [{ ...toast, id }, ...current].slice(0, 4));
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5200);
  }, []);

  const value = useMemo(() => ({ toasts, showToast }), [showToast, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.wrap} pointerEvents="box-none">
        {toasts.map((toast) => (
          <Pressable key={toast.id} style={[styles.toast, toast.tone === "error" && styles.error, toast.tone === "success" && styles.success]} onPress={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
            <Text style={styles.title}>{toast.title}</Text>
            {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
          </Pressable>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 18,
    right: 18,
    gap: 10,
    zIndex: 50,
    width: 330,
    maxWidth: "92%"
  },
  toast: {
    borderRadius: radii.md,
    padding: 14,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: "rgba(217,193,132,0.4)",
    ...shadow
  },
  success: {
    borderColor: colors.success
  },
  error: {
    borderColor: colors.danger
  },
  title: {
    color: colors.pearl,
    fontWeight: "800"
  },
  message: {
    color: "rgba(251,250,247,0.74)",
    marginTop: 5,
    lineHeight: 18
  }
});
