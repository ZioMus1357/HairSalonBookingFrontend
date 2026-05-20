import { useEffect, useRef, useState } from "react";
import { adminApi } from "../api";
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
  const notifiedAppointmentIds = useRef<Set<string>>(new Set());
  const polledAdminAppointmentIds = useRef<Set<string> | null>(null);
  const [status, setStatus] = useState<"online" | "offline" | "connecting">("connecting");

  useEffect(() => {
    if (auth.loading) {
      setStatus("connecting");
      return;
    }

    let disposed = false;
    let started = false;
    const hub = createBookingHub();

    const markAppointment = (payload?: BookingNotificationPayload) => {
      if (payload?.appointmentId) {
        notifiedAppointmentIds.current.add(payload.appointmentId);
      }
    };

    const notifyAppointmentBooked = (payload?: BookingNotificationPayload) => {
      markAppointment(payload);
      const serviceName = payload?.serviceName ?? payload?.salonServiceName;
      showToast({
        title: "Nowa rezerwacja",
        message: serviceName ? `Zarezerwowano usługę: ${serviceName}.` : "Pojawiła się nowa wizyta w terminarzu.",
        tone: "success",
      });
    };

    const notifyHairdresserAppointmentBooked = (payload?: BookingNotificationPayload) => {
      markAppointment(payload);
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

  useEffect(() => {
    if (auth.loading || auth.role !== "Admin") {
      polledAdminAppointmentIds.current = null;
      return;
    }

    let disposed = false;
    const poll = async () => {
      try {
        const appointments = await adminApi.appointments();
        const currentIds = new Set(appointments.map((appointment) => appointment.id).filter(Boolean));
        const previousIds = polledAdminAppointmentIds.current;

        if (previousIds) {
          const newAppointments = appointments.filter((appointment) => appointment.id && !previousIds.has(appointment.id) && !notifiedAppointmentIds.current.has(appointment.id));
          newAppointments.forEach((appointment) => {
            if (appointment.id) {
              notifiedAppointmentIds.current.add(appointment.id);
            }
          });
          if (!disposed && newAppointments.length > 0) {
            showToast({
              title: newAppointments.length === 1 ? "Nowa rezerwacja" : "Nowe rezerwacje",
              message: newAppointments.length === 1 ? "Pojawiła się nowa wizyta w terminarzu." : `Pojawiły się nowe wizyty: ${newAppointments.length}.`,
              tone: "success",
            });
          }
        }

        polledAdminAppointmentIds.current = currentIds;
      } catch {
        return;
      }
    };

    poll();
    const interval = setInterval(poll, 12000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [auth.loading, auth.role, showToast]);

  return { status, connection: connection.current };
}
