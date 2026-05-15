import { Appointment, Customer, Hairdresser, SalonService } from "../types/domain";

export const money = (value: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(value);

export const dateOnly = (date = new Date()) => date.toISOString().slice(0, 10);

export const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateOnly(date);
};

export const fullName = (person?: Pick<Customer | Hairdresser, "firstName" | "lastName"> | null) => {
  if (!person) return "Nieznany";
  return `${person.firstName} ${person.lastName}`.trim();
};

export const appointmentLabel = (appointment: Appointment, services: SalonService[], hairdressers: Hairdresser[], customers: Customer[]) => {
  const service = services.find((item) => item.id === appointment.salonServiceId)?.name ?? appointment.salonServiceId;
  const hairdresser = fullName(hairdressers.find((item) => item.id === appointment.hairdresserId));
  const customer = fullName(customers.find((item) => item.id === appointment.customerId));
  return { service, hairdresser, customer };
};

export const toLocalDateTime = (value: string) => new Date(value).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });

export const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Nieznany błąd.");
