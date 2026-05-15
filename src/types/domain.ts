export type AppointmentStatus = "Booked" | "Confirmed" | "Completed" | "Cancelled";
export type UserRole = "Customer" | "Hairdresser" | "Admin";

export type BookingEntity = {
  id: string;
  partitionKey?: string;
};

export type Customer = BookingEntity & {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  notes?: string | null;
};

export type Hairdresser = BookingEntity & {
  firstName: string;
  lastName: string;
  specialization: string;
  photoUrl?: string | null;
  photoBlobName?: string | null;
  isActive: boolean;
};

export type SalonService = BookingEntity & {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isAvailable: boolean;
};

export type Appointment = BookingEntity & {
  customerId: string;
  hairdresserId: string;
  salonServiceId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes?: string | null;
};

export type SalonPhoto = BookingEntity & {
  fileName: string;
  blobName: string;
  blobUrl: string;
  caption?: string | null;
  uploadedAt: string;
};

export type AppUser = BookingEntity & {
  provider: string;
  providerUserId: string;
  email: string;
  displayName: string;
  role: UserRole;
  customerId?: string | null;
  hairdresserId?: string | null;
  createdAt: string;
  lastLoginAt: string;
};

export type AuthMe = {
  provider: string;
  providerUserId: string;
  name: string;
  email: string;
  user?: AppUser | null;
  customer?: Customer | null;
};

export type AppointmentRequest = {
  customerId: string;
  hairdresserId: string;
  salonServiceId: string;
  startAt: string;
  status: AppointmentStatus;
  notes?: string | null;
};

export type CustomerRequest = Omit<Customer, "id" | "partitionKey">;
export type HairdresserRequest = Omit<Hairdresser, "id" | "partitionKey" | "photoUrl" | "photoBlobName">;
export type SalonServiceRequest = Omit<SalonService, "id" | "partitionKey">;

export type HairdresserCustomerHistory = {
  customer: Customer;
  previousAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  usedServiceIds: string[];
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};
