import { apiFetch } from "./api";

export function getActivities(params = {}) {
  const usp = new URLSearchParams();
  if (params.type) usp.set("type", params.type);
  if (params.unit) usp.set("unit", params.unit);
  if (params.q) usp.set("q", params.q);

  const qs = usp.toString();
  return apiFetch(`/activities${qs ? `?${qs}` : ""}`);
}

export function getActivityDetail(id) {
  return apiFetch(`/activities/${id}`);
}

export function registerActivity(id) {
  return apiFetch(`/activities/${id}/register`, { method: "POST" });
}

export function cancelRegistration(id) {
  return apiFetch(`/activities/${id}/register`, { method: "DELETE" });
}

export function getMyRegistrations() {
  return apiFetch(`/activities/me/registrations`);
}
