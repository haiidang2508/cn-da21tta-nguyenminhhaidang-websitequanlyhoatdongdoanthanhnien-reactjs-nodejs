import React, { createContext, useContext, useState, useCallback } from 'react';

const NotifyContext = createContext(null);

export function NotifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = 'info', opts = {}) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const duration = typeof opts.duration === 'number' ? opts.duration : 5000; // default 5s
    const t = { id, message, type, duration };
    setToasts((cur) => [t, ...cur]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== id));
    }, duration);
  }, []);

  const remove = useCallback((id) => setToasts((cur) => cur.filter((x) => x.id !== id)), []);

  return (
    <NotifyContext.Provider value={{ notify }}>
      {children}
      <div className="notifyContainer" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status" style={{ position: 'relative' }}>
            <div className="toastMessage">{t.message}</div>
            <button className="toastClose" onClick={() => remove(t.id)} aria-label="Đóng">×</button>
            <div className="toastProgress" style={{ ['--toast-duration']: `${t.duration}ms` }} aria-hidden />
          </div>
        ))}
      </div>
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  return ctx ? ctx.notify : () => {};
}
