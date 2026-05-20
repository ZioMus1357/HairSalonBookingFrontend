import { useEffect, useRef, useState } from "react";
import { createBookingHub } from "../api/signalr";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

type BookingNotificationPayload = {
  appointmentId?: string;
  serviceName?: string;
  salonServiceName?: string;
  startAt?: string;
};

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

    const notifyAppointmentBooked = (payload?: BookingNotificationPayload) => {
      const serviceName = payload?.serviceName ?? payload?.salonServiceName;
      showToast({
        title: "Nowa rezerwacja",
        message: serviceName ? `Zarezerwowano usługę: ${serviceName}.` : "Pojawiła się nowa wizyta w terminarzu.",
        tone: "success",
      });
    };

    const notifyHairdresserAppointmentBooked = (payload?: BookingNotificationPayload) => {
      if (auth.role === "Hairdresser" || auth.role === "Admin") {
        const serviceName = payload?.serviceName ?? payload?.salonServiceName;
        showToast({
          title: "Nowa wizyta u fryzjera",
          message: serviceName ? `Nowa rezerwacja: ${serviceName}.` : "Ktoś zarezerwował termin w kalendarzu.",
          tone: "info",
        });
      }
    };

    const notifyTest = () => {
      showToast({ title: "Test powiadomień", message: "Powiadomienie testowe dotarło do aplikacji.", tone: "info" });
    };

    hub.on("appointmentBooked", notifyAppointmentBooked);
    hub.on("AppointmentBooked", notifyAppointmentBooked);
    hub.on("hairdresserAppointmentBooked", notifyHairdresserAppointmentBooked);
    hub.on("HairdresserAppointmentBooked", notifyHairdresserAppointmentBooked);
    hub.on("testNotification", notifyTest);
    hub.on("TestNotification", notifyTest);

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
