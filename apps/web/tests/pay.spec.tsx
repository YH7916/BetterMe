import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PayPage } from '../src/pages/PayPage';
import * as client from '../src/lib/api-client';
import { clearPendingAssessmentSession } from '../src/features/assessment/assessment-session';

beforeEach(() => {
  localStorage.setItem('bm_user_id', 'u1');
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
  vi.spyOn(client.api, 'pay').mockResolvedValue({ status: 'active' });
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

    await waitFor(() => expect(client.api.pay).toHaveBeenCalledWith('u1', 'a1'));
    expect(await screen.findByText(/Unlocked result route/i)).toBeTruthy();
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
