const BASE_URL = "http://localhost:5000/api";

export function getAdminToken() {
  return localStorage.getItem("admin_token");
}

export function getAdminUser() {
  const raw = localStorage.getItem("admin_user");
  return raw ? JSON.parse(raw) : null;
}

export function setAdminAuth(token, user) {
  localStorage.setItem("admin_token", token);
  localStorage.setItem("admin_user", JSON.stringify(user));
}

export function clearAdminAuth() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
}

export async function adminFetch(path, options = {}) {
  const token = getAdminToken();

  // Build headers but avoid setting Content-Type when sending FormData so browser sets boundary
  const headers = {
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  // If body is present and not FormData and Content-Type wasn't provided, set to JSON
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Normalize path: ensure admin prefix so callers can use '/users' or 'users'
  const normalizedPath = path.startsWith("/admin") ? path : `/admin${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(`${BASE_URL}${normalizedPath}`, { ...options, headers });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || res.statusText || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// Upload helper that preserves progress reporting (uses XMLHttpRequest)
export function adminUpload(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      const token = getAdminToken();
      const normalizedPath = path.startsWith("/admin") ? path : `/admin${path.startsWith("/") ? path : `/${path}`}`;
      xhr.open('POST', `${BASE_URL}${normalizedPath}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable && typeof onProgress === 'function') onProgress(Math.round((ev.loaded/ev.total)*100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch(e) { resolve(null); }
        } else {
          try {
            const j = JSON.parse(xhr.responseText || '{}');
            const msg = j.message || `Upload failed (${xhr.status})`;
            const detail = j.detail ? `: ${j.detail}` : (j.errors ? `: ${JSON.stringify(j.errors)}` : '');
            reject(new Error(msg + detail));
          } catch (e) { reject(new Error(`Upload failed (${xhr.status})`)); }
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    } catch (err) { reject(err); }
  });
}

// Download helper: return fetch Response so caller can call res.blob()
export async function adminDownload(path) {
  const token = getAdminToken();
  const normalizedPath = path.startsWith("/admin") ? path : `/admin${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(`${BASE_URL}${normalizedPath}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    let msg = 'Download failed';
    try { const d = await res.json(); msg = d.message || msg; } catch (e) {}
    throw new Error(msg);
  }
  return res;
}
