import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { API_BASE_URL } from "./client";

export function createBookingHub(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/booking-notifications`)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.None)
    .build();
}
