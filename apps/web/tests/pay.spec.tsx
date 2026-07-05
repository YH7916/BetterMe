import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { PayPage } from '../src/pages/PayPage';
import * as client from '../src/lib/api-client';
import { clearPendingAssessmentSession } from '../src/features/assessment/assessment-session';

const paymentResponse = {
  status: 'active',
  payment: {
    id: 'p1',
    provider: 'mock',
    provider_ref: 'mock_ref',
    status: 'succeeded',
    amount_cents: 1900,
    currency: 'CNY',
  },
};

const fullResponse = {
  member: true,
  result: {
    bmi: 25.7,
    bmi_category: 'overweight',
    daily_calorie_intake: 1680,
    target_date: '2026-06-01',
    algorithm_version: 'v1',
  },
} as const;

beforeEach(() => {
  localStorage.setItem('bm_token', 't1');
  localStorage.setItem('bm_assessment_id', 'a1');
  sessionStorage.clear();
  sessionStorage.setItem('bm_assessment_snapshot', JSON.stringify({
    gender: 'female',
    primary_goal: 'lose_weight',
    age: 28,
    height_cm: 165,
    weight_kg: 70,
    target_weight_kg: 60,
    workout_frequency: 'light',
  }));
  vi.spyOn(client.api, 'pay').mockResolvedValue(paymentResponse);
  vi.spyOn(client.api, 'getResult').mockResolvedValue(fullResponse);
});

afterEach(() => {
  cleanup();
  clearPendingAssessmentSession();
  vi.restoreAllMocks();
});

describe('PayPage', () => {
  it('shows a dedicated checkout page without charging automatically', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PayPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /完整报告付费确认/i })).toBeTruthy();
    expect(screen.getByText('¥')).toBeTruthy();
    expect(screen.getByText('19')).toBeTruthy();
    expect(screen.getByText(/每日建议摄入/)).toBeTruthy();
    expect(client.api.pay).not.toHaveBeenCalled();
  });

  it('calls the pay endpoint after confirmation and redirects back to the result page', async () => {
    render(
      <MemoryRouter initialEntries={['/pay']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/pay" element={<PayPage />} />
          <Route path="/result" element={<div>Unlocked result route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /确认支付|立即解锁/i }));

    await waitFor(() => expect(client.api.pay).toHaveBeenCalledWith('a1'));
    expect(await screen.findByText(/Unlocked result route/i)).toBeTruthy();
  });

  it('fetches the backend-confirmed full result before returning from checkout', async () => {
    function ResultRouteProbe() {
      const location = useLocation();
      return <div>{location.state?.result?.result?.daily_calorie_intake ?? 'no result state'}</div>;
    }

    render(
      <MemoryRouter initialEntries={['/pay']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/pay" element={<PayPage />} />
          <Route path="/result" element={<ResultRouteProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /确认支付|立即解锁/i }));

    await waitFor(() => expect(client.api.pay).toHaveBeenCalledWith('a1'));
    await waitFor(() => expect(client.api.getResult).toHaveBeenCalledWith('a1'));
    expect(await screen.findByText('1680')).toBeTruthy();
  });

  it('shows a recoverable payment error when the callback fails', async () => {
    vi.mocked(client.api.pay).mockRejectedValueOnce(new Error('payment failed'));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PayPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /确认支付|立即解锁/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/payment failed/i);
  });

  it('asks users to finish the assessment before paying when no session exists', () => {
    localStorage.clear();

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PayPage /></MemoryRouter>);

    expect(screen.getByText(/请先完成测评/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /开始测评|重新开始/i })).toBeTruthy();
    expect(client.api.pay).not.toHaveBeenCalled();
  });
});
