import logoTVU from "../assets/Logo_Trường_Đại_học_Trà_Vinh.png";
import logoDoan from "../assets/Huy_Hiệu_Đoàn.png";

export default function Header({ admin = false }) {
  return (
    <header className={`header ${admin ? 'header--admin' : ''}`}>
      <div className="container header-inner header-split">
        {/* LEFT: Trường Đại học Trà Vinh */}
        <div className="header-block left">
          <img
            src={logoTVU}
            alt="Logo Trường Đại học Trà Vinh"
            className="brand-logo"
          />
          <div className="brand-text">
            <div className="brand-title">TRƯỜNG ĐẠI HỌC TRÀ VINH</div>
          </div>
        </div>

        {/* RIGHT: Logo Đoàn -> chữ */}
        <div className="header-block right">
          <img
            src={logoDoan}
            alt="Huy hiệu Đoàn TNCS Hồ Chí Minh"
            className="brand-logo"
          />

          <div className="brand-text right-text">
            <div className="brand-title">ĐOÀN THANH NIÊN</div>
            <div className="brand-subtitle">
              Trường Kỹ thuật và Công nghệ
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
