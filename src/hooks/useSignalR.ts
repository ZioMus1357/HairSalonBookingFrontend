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
    if (auth.loading) {
      setStatus("connecting");
      return;
    }

    let disposed = false;
    let started = false;
    const hub = createBookingHub();

    hub.on("appointmentBooked", (payload) => {
      showToast({
        title: "Nowa rezerwacja",
        message: payload?.serviceName ? `Zarezerwowano usługę: ${payload.serviceName}.` : "Pojawiła się nowa wizyta w terminarzu.",
        tone: "success",
      });
    });

    hub.on("hairdresserAppointmentBooked", () => {
      if (auth.role === "Hairdresser" || auth.role === "Admin") {
        showToast({ title: "Nowa wizyta u fryzjera", message: "Ktoś zarezerwował termin w Twoim kalendarzu.", tone: "info" });
      }
    });

    hub.on("testNotification", () => {
      showToast({ title: "Test SignalR", message: "Powiadomienie testowe dotarło do aplikacji.", tone: "info" });
    });

    setStatus("connecting");
    hub.start().then(() => {
      started = true;
      if (disposed) {
        hub.stop().catch(() => undefined);
        return;
      }

      connection.current = hub;
      setStatus("online");

      const hairdresserId = auth.user?.hairdresserId;
      if (hairdresserId) {
        hub.invoke("JoinHairdresserGroup", hairdresserId).catch(() => undefined);
      }
    }).catch(() => {
      if (!disposed) {
        setStatus("offline");
      }
    });

    return () => {
      disposed = true;
      if (connection.current === hub) {
        connection.current = null;
      }
      if (started) {
        hub.stop().catch(() => undefined);
      }
    };
  }, [auth.loading, auth.role, auth.user?.hairdresserId, showToast]);

  return { status, connection: connection.current };
}
