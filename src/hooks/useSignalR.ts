import { useEffect, useRef, useState } from "react";
import { createBookingHub } from "../api/signalr";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export function useSignalR() {
  const { showToast } = useToast();
  const auth = useAuth();
  const connection = useRef<ReturnType<typeof createBookingHub> | null>(null);
  const [status, setStatus] = useState<"online" | "offline" | "connecting">("connecting");

  useEffect(() => {
    const hub = createBookingHub();
    hub.on("appointmentBooked", (payload) => {
      showToast({ title: "Nowa rezerwacja", message: payload?.appointmentId ?? "Odebrano zdarzenie appointmentBooked.", tone: "success" });
    });
    hub.on("hairdresserAppointmentBooked", () => {
      if (auth.role === "Hairdresser" || auth.role === "Admin") {
        showToast({ title: "Nowa wizyta u fryzjera", message: "SignalR dostarczył powiadomienie do grupy fryzjera.", tone: "info" });
      }
    });
    hub.on("testNotification", () => {
      showToast({ title: "Test SignalR", message: "Powiadomienie testowe dotarło do aplikacji.", tone: "info" });
    });
    hub
      .start()
      .then(() => {
        connection.current = hub;
        setStatus("online");
        const hairdresserId = auth.user?.hairdresserId;
        if (hairdresserId) {
          hub.invoke("JoinHairdresserGroup", hairdresserId).catch(() => undefined);
        }
      })
      .catch(() => setStatus("offline"));
    return () => {
      hub.stop();
      connection.current = null;
    };
  }, [auth.role, auth.user?.hairdresserId, showToast]);

  return { status, connection: connection.current };
}
