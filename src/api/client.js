import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/*Thin fetch wrapper matching the backend's plain-status-code / plain-json
 responses. Not called from anywhere yet — screens still use mock data.*/
export async function apiRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${method} ${path} failed with status ${response.status}`,
    );
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
