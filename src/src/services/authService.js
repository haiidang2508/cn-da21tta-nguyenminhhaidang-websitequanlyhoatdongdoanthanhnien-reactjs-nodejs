import { apiFetch, setAuth, clearAuth, getUser as getUserFromApi, getToken } from "./api";
import { clearAdminAuth } from "./adminApi";

// Register: { fullName, studentId, email, password }
export async function register(payload) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Login: { emailOrStudentId, password } (hoặc { email, password } / { studentId, password })
export async function login(payload) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setAuth(data.token, data.user);
  // Ensure any existing admin session is cleared when a regular user logs in
  clearAdminAuth();
  return data.user;
}

export function logout() {
  clearAuth();
  // Also clear admin session if present
  clearAdminAuth();
}

export function getUser() {
  return getUserFromApi();
}

export function isLoggedIn() {
  return !!getToken();
}

// Change password: { currentPassword, newPassword }
export async function changePassword(payload) {
  return apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
} 
