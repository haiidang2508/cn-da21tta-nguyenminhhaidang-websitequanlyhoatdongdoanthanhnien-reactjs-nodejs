import { render, screen, waitFor } from "@testing-library/react";
import AdminDashboard from "../AdminDashboard";
import * as adminApi from "../../services/adminApi";
import { BrowserRouter } from "react-router-dom";

jest.spyOn(adminApi, 'adminFetch').mockImplementation(async (path) => {
  if (path === "/admin/dashboard") {
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0,10);
    const series30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      d.setDate(d.getDate() - i);
      series30.push({ date: iso(d), count: i % 5 });
    }

    return {
      totalUsers: 10,
      totalActivities: 5,
      totalRegistrations: 20,
      openActivities: 2,
      ongoingActivities: 1,
      finishedActivities: 2,
      totalNews: 7,
      activeMembers: 3,
      registrationsSeries30: series30,
      registrationsSeries14: series30.slice(16),
      registrationsSeries7: series30.slice(23),
      topActivities: [
        { id: 1, title: 'A', participants: 6 },
        { id: 2, title: 'B', participants: 4 },
      ],
      participationRate: 30,
      uniqueRegisteredUsers: 3,
      activitiesWithRegistrations: 3,
    };
  }
  return {};
});

test('renders dashboard stats', async () => {
  render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>
  );

  await waitFor(() => expect(screen.getByText(/Người dùng/i)).toBeInTheDocument());

  expect(screen.getByText('10')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('20')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();

  // check other widgets
  expect(screen.getByText(/Top hoạt động có nhiều người tham gia/i)).toBeInTheDocument();
  expect(screen.getByText(/Tỉ lệ tham gia/i)).toBeInTheDocument();
  expect(screen.getByText('30%')).toBeInTheDocument();
  expect(screen.getByText('A')).toBeInTheDocument();

  // export CSV button should be present
  expect(screen.getByText('Xuất CSV')).toBeInTheDocument();

  // chart titles / labels should be translated to Vietnamese
  expect(screen.getByText('Lượt đăng ký hoạt động')).toBeInTheDocument();
  expect(screen.getByText('Số hoạt động: Tạo và Có đăng ký')).toBeInTheDocument();
  expect(screen.getByText('Top hoạt động theo số người tham gia')).toBeInTheDocument();
});