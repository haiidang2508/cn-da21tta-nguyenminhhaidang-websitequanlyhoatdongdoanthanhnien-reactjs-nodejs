// DEPRECATED: registration service removed because admin registrations UI was removed.
// If you need registration persistence back, restore from git history or re-implement.

export function getRegistrations() {
  throw new Error('registration service removed');
}
export function isRegistered() {
  return false;
}
export function registerActivity() {
  throw new Error('registration service removed');
}
export function unregisterActivity() {
  throw new Error('registration service removed');
}

