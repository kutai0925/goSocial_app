import { apiRequest } from "./client";

// -> Uuid (string)
export function signUp({ username, password }) {
  return apiRequest("/v1/users", {
    method: "POST",
    body: { username, password_hash: password },
  });
}

// -> Uuid (string)
export function logIn({ username, password }) {
  return apiRequest("/v1/users/login", {
    method: "PUT",
    body: { username, password_hash: password },
  });
}

export function deleteUser(userId) {
  return apiRequest(`/v1/users/${userId}`, { method: "DELETE" });
}

// -> User { username, user_id, coordinates }
export function getUser(userId) {
  return apiRequest(`/v1/users/${userId}`);
}

// -> User[]
export function getNearbyUsers() {
  return apiRequest("/v1/users/nearby");
}

export function setLocation(userId, { lat, lon, accuracy }) {
  return apiRequest(`/v1/users/${userId}/coordinates`, {
    method: "PUT",
    body: { lat, lon, accuracy },
  });
}
