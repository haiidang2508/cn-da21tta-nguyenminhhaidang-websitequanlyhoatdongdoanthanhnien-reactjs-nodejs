import { render, screen, waitFor } from "@testing-library/react";
import AdminNews from "../admin/AdminNews";
import * as adminApi from "../../services/adminApi";
import { BrowserRouter } from "react-router-dom";

jest.spyOn(adminApi, 'adminFetch').mockImplementation(async (path) => {
  if (path && path.startsWith('/news')) {
    return {
      items: [
        { id: 1, title: 'Tin A', author: 'Nguyen', publish_date: '2025-12-01T00:00:00.000Z', published: 1 },
        { id: 2, title: 'Tin B', author: 'Tran', publish_date: '2025-12-10T00:00:00.000Z', published: 0 },
      ],
      total: 2,
    };
  }
  return {};
});

test('renders list of news items', async () => {
  render(
    <BrowserRouter>
      <AdminNews />
    </BrowserRouter>
  );

  await waitFor(() => expect(screen.getByText(/Quản lý Tin tức/i)).toBeInTheDocument());

  expect(screen.getByText('Tin A')).toBeInTheDocument();
  expect(screen.getByText('Tin B')).toBeInTheDocument();
  expect(screen.getByText('Nguyen')).toBeInTheDocument();
  expect(screen.getByText('Tran')).toBeInTheDocument();
});