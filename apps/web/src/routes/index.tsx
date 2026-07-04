import { createBrowserRouter } from 'react-router-dom';
import { FunnelPage } from '../pages/FunnelPage';
import { PayPage } from '../pages/PayPage';
import { ResultPage } from '../pages/ResultPage';

export const router = createBrowserRouter([
  { path: '/', element: <FunnelPage /> },
  { path: '/result', element: <ResultPage /> },
  { path: '/pay', element: <PayPage /> },
], { future: { v7_relativeSplatPath: true } });
