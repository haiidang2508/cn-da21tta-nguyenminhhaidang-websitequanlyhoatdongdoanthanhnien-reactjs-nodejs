export function assetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  // Ensure no double slashes
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}
