import { adminFetch, setAdminAuth, clearAdminAuth, getAdminUser } from "./adminApi";
import { setAuth, clearAuth } from "./api";

export async function adminLogin(payload) {
  // payload: { emailOrStudentId, password }
  const data = await adminFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setAdminAuth(data.token, data.admin);
  // If this admin is a secretary, also set the regular user auth so they can use public JWT-protected endpoints
  if (data.admin && data.admin.role === 'secretary') {
    try {
      // Map admin info to user shape expected by the public auth flow
      const user = { id: data.admin.id, fullName: data.admin.fullName || data.admin.name || data.admin.email, email: data.admin.email, role: 'secretary' };
      setAuth(data.token, user);
    } catch (e) { /* ignore */ }
  } else {
    // Ensure any regular user session is cleared when non-secretary admin logs in
    clearAuth();
  }
  return data.admin;
}

export function adminLogout() {
  clearAdminAuth();
  // Also clear regular auth to be safe
  clearAuth();
}

export function getAdmin() {
  return getAdminUser();
} 
