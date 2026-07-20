import { apiRequest } from "./client";

export function getNearbyEvents() {
  return apiRequest("/v1/events/nearby");
}

export function createEvent(event) {
  return apiRequest("/v1/events", {
    method: "POST",
    body: event,
  });
}
