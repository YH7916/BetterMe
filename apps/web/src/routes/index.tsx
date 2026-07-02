import { createBrowserRouter } from 'react-router-dom';
import { FunnelPage } from '../pages/FunnelPage';
import { ResultPage } from '../pages/ResultPage';

export const router = createBrowserRouter([
  { path: '/', element: <FunnelPage /> },
  { path: '/result', element: <ResultPage /> },
], { future: { v7_relativeSplatPath: true } });
