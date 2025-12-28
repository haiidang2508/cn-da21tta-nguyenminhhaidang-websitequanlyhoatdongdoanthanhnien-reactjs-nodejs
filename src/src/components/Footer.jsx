export default function Footer({ admin = false }) {
  const year = new Date().getFullYear();
  return (
    <footer className={`footer ${admin ? 'footer--admin' : ''}`}>
      <div className="container">
        <div className="footer-top">
          <div className="footer-contact-item footer-top-line">
            © {year} Đoàn Thanh niên - Trường Kỹ thuật và Công nghệ
          </div>
        </div>

        <div className="footer-inner">
          <div className="footer-contact">
            <div className="footer-contact-item">
              <span className="footer-icon" aria-hidden="true">📍</span>
              <span> Số 126, Nguyễn Thiện Thành, Khóm 4, Phường Hòa Thuận, Tỉnh Vĩnh Long</span>
            </div>
            <div className="footer-contact-item">
              <span className="footer-icon" aria-hidden="true">📞</span>
              <a href="tel:+842943855246"> (+84) 294.3855246 (Ext: 135 - 203)</a>
            </div>
            <div className="footer-contact-item">
              <span className="footer-icon" aria-hidden="true">✉️</span>
              <a href="mailto:ktcn@tvu.edu.vn"> ktcn@tvu.edu.vn</a>
            </div>
            <div className="footer-contact-item">
              <span className="footer-icon" aria-hidden="true">👤</span>
              <span> Nguyễn Minh Hải Đăng - 110121181 - DA21TTA</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
