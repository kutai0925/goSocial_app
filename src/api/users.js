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

// -> User { username, user_id, coordinates, firstName, lastName, bio, location, profileImage }
export function getUser(userId, viewerId) {
  return apiRequest(
    viewerId
      ? `/v1/users/${userId}?viewer_id=${viewerId}`
      : `/v1/users/${userId}`,
  );
}

// -> User[]
export function getNearbyUsers(userId) {
  // Pass userId to get relationship statuses
  return apiRequest(
    userId ? `/v1/users/nearby?user_id=${userId}` : "/v1/users/nearby",
  );
}

export function setLocation(userId, { lat, lon, accuracy }) {
  return apiRequest(`/v1/users/${userId}/coordinates`, {
    method: "PUT",
    body: { lat, lon, accuracy },
  });
}

export function updateProfile(userId, profileData) {
  return apiRequest(`/v1/users/${userId}/profile`, {
    method: "PUT",
    body: {
      first_name: profileData.firstName,
      last_name: profileData.lastName,
      bio: profileData.bio,
      location: profileData.location,
      profile_image: profileData.profileImage,
    },
  });
}

// Waves API
export function sendWave(fromUserId, toUserId) {
  return apiRequest(`/v1/waves/${fromUserId}/${toUserId}`, {
    method: "POST",
  });
}

export function acceptWave(fromUserId, toUserId) {
  // Accepts a wave that was sent from fromUserId to toUserId
  return apiRequest(`/v1/waves/${fromUserId}/${toUserId}/accept`, {
    method: "PUT",
  });
}

export function declineWave(fromUserId, toUserId) {
  return apiRequest(`/v1/waves/${fromUserId}/${toUserId}/decline`, {
    method: "PUT",
  });
}
