import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Home from "../Home";
import * as api from "../../services/api";
import { BrowserRouter } from "react-router-dom";

jest.spyOn(api, 'apiFetch').mockImplementation(async (path) => {
  if (path === '/news/featured') {
    return { title: 'Featured X', time: '01/01/2025', views: 10, excerpt: 'Ex', image: '/img.jpg', url: 'http://a', tags: ['t'] };
  }
  if (path.startsWith('/news?group=Tin%20m%E1%BB%9Bi')) {
    return [
      { id: 1, title: 'Tin Mới 1', author: 'A', publish_date: '2025-12-01', image: '/1.jpg', url: 'http://1' },
    ];
  }
  if (path.startsWith('/news?group=Tin%20c%E1%BB%95%20s%E1%BB%AF')) {
    return [
      { id: 2, title: 'Tin Cơ Sở 1', author: 'B', publish_date: '2025-12-02', image: '/2.jpg', url: 'http://2' },
    ];
  }
  return [];
});

test('shows news in both tabs', async () => {
  render(
    <BrowserRouter>
      <Home />
    </BrowserRouter>
  );

  // Wait for featured title
  await waitFor(() => expect(screen.getByText(/Tiêu điểm/i)).toBeInTheDocument());

  // Ensure Tin mới tab shows item
  expect(screen.getByText('Tin Mới 1')).toBeInTheDocument();

  // Switch to Tin Tức (label changed)
  fireEvent.click(screen.getByText(/TIN TỨC/i));
  expect(await screen.findByText('Tin Cơ Sở 1')).toBeInTheDocument();
});