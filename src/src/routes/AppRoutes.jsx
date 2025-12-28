import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Activities from "../pages/Activities";
import ActivityDetail from "../pages/ActivityDetail";
import MyActivities from "../pages/MyActivities";
import AdminDashboard from "../pages/AdminDashboard";

import AdminLayout from "../components/Adminlayout";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminActivities from "../pages/admin/AdminActivities";
import AdminNews from "../pages/admin/AdminNews";
import AdminDocuments from "../pages/admin/AdminDocumentsV2";
import AdminForms from "../pages/admin/AdminForms";

import SecretaryLayout from "../components/SecretaryLayout";
import SecretaryDashboard from "../pages/secretary/SecretaryDashboard";
import SecretaryUsers from "../pages/secretary/SecretaryUsers";
import News from "../pages/News";
import NewsDetail from "../pages/NewsDetail";
import Documents from "../pages/Documents";
import Forms from "../pages/Forms";
import ChangePassword from "../pages/ChangePassword";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Tuần 2-3 (để sẵn route cho demo sau) */}
      <Route path="/activities" element={<Activities />} />
      <Route path="/activities/:id" element={<ActivityDetail />} />
      <Route path="/my-activities" element={<MyActivities />} />

      {/* Admin area */}
      {/* Keep /admin/login for backward compatibility, redirect to unified login */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="activities" element={<AdminActivities />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="forms" element={<AdminForms />} />
      </Route>

      {/* Secretary area */}
      <Route path="/secretary" element={<SecretaryLayout />}>
        <Route index element={<SecretaryDashboard />} />
        <Route path="activities" element={<AdminActivities />} />
        <Route path="users" element={<SecretaryUsers />} />
      </Route>

      <Route path="/news" element={<News />} />
      <Route path="/news/:id" element={<NewsDetail />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/forms" element={<Forms />} />

      <Route path="/change-password" element={<ChangePassword />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
