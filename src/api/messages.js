import { apiRequest } from "./client";

export function sendMessage(userId, { message, toUserId }) {
  return apiRequest(`/v1/messages/${userId}`, {
    method: "POST",
    body: { message, to_user_id: toUserId },
  });
}

// -> Message[] { message, to_user_id, timestamp, received }
export function getMessages(userId) {
  return apiRequest(`/v1/messages/list/${userId}`);
}
