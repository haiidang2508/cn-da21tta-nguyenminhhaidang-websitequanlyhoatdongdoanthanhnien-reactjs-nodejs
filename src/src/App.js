import { useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import Header from "./components/Header";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function App() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");

  return (
    <div className="app-shell">
      {/* ✅ Ẩn header/footer ở trang admin */}
      {!isAdminPath && <Header />}
      <Navbar />

      <main className={isAdminPath ? "adminPage" : "container main"}>
        <AppRoutes />
      </main>

      {!isAdminPath && <Footer />}
    </div>
  );
}
