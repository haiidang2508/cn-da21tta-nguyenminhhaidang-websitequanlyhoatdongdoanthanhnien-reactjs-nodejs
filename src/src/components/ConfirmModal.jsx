export default function ConfirmModal({ open, title, message, confirmText = 'OK', cancelText = 'Hủy', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalCard">
        <div className="modalHeader">
          <div className="h1" style={{ fontSize: 18 }}>{title}</div>
        </div>
        <div className="modalBody">
          <div className="muted">{message}</div>
        </div>
        <div className="modalActions">
          <button className="btn btn-outline" type="button" onClick={onCancel}>{cancelText}</button>
          <button className={`btn ${confirmText === 'Xóa' ? 'danger' : ''}`} type="button" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}