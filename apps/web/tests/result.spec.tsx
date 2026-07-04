import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResultPage } from '../src/pages/ResultPage';
import * as client from '../src/lib/api-client';
import type { ResultResponse } from '../src/features/result/types';
import { clearPendingAssessmentSession } from '../src/features/assessment/assessment-session';

const maskedResponse: ResultResponse = {
  member: false,
  result: { bmi: 25.7, bmi_category: 'overweight', locked: true, message: '升级会员查看每日建议摄入与目标达成日期' },
};

const fullResponse: ResultResponse = {
  member: true,
  result: {
    bmi: 25.7,
    bmi_category: 'overweight',
    daily_calorie_intake: 1680,
    target_date: '2026-06-01',
    algorithm_version: 'v1',
  },
};

beforeEach(() => {
  localStorage.setItem('bm_user_id', 'u1');
  localStorage.setItem('bm_assessment_id', 'a1');
  sessionStorage.clear();
  const getResult = vi.spyOn(client.api, 'getResult');
  getResult.mockResolvedValueOnce(maskedResponse);
  getResult.mockResolvedValueOnce(fullResponse);
  vi.spyOn(client.api, 'pay').mockResolvedValue({ status: 'active' });
});

afterEach(() => {
  cleanup();
  clearPendingAssessmentSession();
  vi.restoreAllMocks();
});

describe('ResultPage', () => {
  it('shows a restart prompt instead of loading forever when no session exists', async () => {
    localStorage.clear();

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(await screen.findByText(/请先完成测评/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /重新开始|start assessment/i })).toBeTruthy();
    expect(client.api.getResult).not.toHaveBeenCalled();
  });

  it('shows an error instead of loading forever when result loading fails', async () => {
    vi.mocked(client.api.getResult).mockReset();
    vi.mocked(client.api.getResult).mockRejectedValueOnce(new Error('result missing'));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    await waitFor(() => screen.getByText(/加载失败|result missing/i));
  });

  it('keeps users on a generating state while a completed assessment result is not ready yet', async () => {
    let resolveResult: (value: ResultResponse) => void;
    vi.mocked(client.api.getResult).mockReset();
    vi.mocked(client.api.getResult)
      .mockRejectedValueOnce(new Error('result not ready'))
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveResult = resolve;
      }));
    vi.spyOn(client.api, 'getProgress').mockResolvedValue({
      assessmentId: 'a1',
      userId: 'u1',
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: 'light',
      current_step: 4,
      status: 'in_progress',
    });
    vi.spyOn(client.api, 'submit').mockResolvedValue({ status: 'completed' });

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(await screen.findByText(/正在生成结果|generating/i)).toBeTruthy();
    await waitFor(() => expect(client.api.submit).toHaveBeenCalledWith('a1'));
    resolveResult!(maskedResponse);
    expect(await screen.findByRole('button', { name: /支付|解锁|pay/i })).toBeTruthy();
  });

  it('shows a local masked preview immediately while the backend result is still generating', async () => {
    sessionStorage.setItem('bm_assessment_snapshot', JSON.stringify({
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: 'light',
    }));
    vi.mocked(client.api.getResult).mockReset();
    vi.mocked(client.api.getResult).mockRejectedValue(new Error('result not ready'));
    vi.spyOn(client.api, 'getProgress').mockReturnValue(new Promise(() => undefined));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(screen.getByText(/BMI/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /支付|解锁|pay/i })).toBeTruthy();
  });

  it('shows a local full preview immediately after pay while the backend result is still generating', async () => {
    sessionStorage.setItem('bm_assessment_snapshot', JSON.stringify({
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: 'light',
    }));
    vi.mocked(client.api.getResult).mockReset();
    vi.mocked(client.api.getResult).mockRejectedValue(new Error('result not ready'));
    vi.spyOn(client.api, 'getProgress').mockReturnValue(new Promise(() => undefined));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /支付|解锁|pay/i }));

    expect(await screen.findByText(/kcal/i)).toBeTruthy();
    expect(screen.queryByText(/解锁你的完整计划/i)).toBeNull();
  });

  it('optimistically shows the full preview while the pay request is still pending', async () => {
    sessionStorage.setItem('bm_assessment_snapshot', JSON.stringify({
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: 'light',
    }));
    vi.mocked(client.api.getResult).mockReset();
    vi.mocked(client.api.getResult).mockRejectedValue(new Error('result not ready'));
    vi.spyOn(client.api, 'getProgress').mockReturnValue(new Promise(() => undefined));
    vi.mocked(client.api.pay).mockReturnValue(new Promise(() => undefined));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /支付|解锁|pay/i }));

    expect(await screen.findByText(/kcal/i)).toBeTruthy();
    expect(screen.queryByText(/解锁你的完整计划/i)).toBeNull();
  });

  it('keeps the current result visible when paid result refresh fails', async () => {
    vi.mocked(client.api.getResult).mockReset();
    vi.mocked(client.api.getResult)
      .mockResolvedValueOnce(maskedResponse)
      .mockRejectedValueOnce(new Error('sync failed'));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    await waitFor(() => screen.getByRole('button', { name: /支付|解锁|pay/i }));
    fireEvent.click(screen.getByRole('button', { name: /支付|解锁|pay/i }));

    await waitFor(() => screen.getByText(/sync failed|同步失败|刷新失败/i));
    expect(screen.getByText(/BMI/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /支付|解锁|pay/i })).toBeTruthy();
  });

  it('shows paywall then full result after pay', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    // Paywall button is present and not disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /支付|解锁|pay/i })).not.toBeDisabled();
    });

    // Protected value NOT rendered in masked state
    expect(screen.queryByText(/1680/)).toBeNull();

    // Click pay button
    fireEvent.click(screen.getByRole('button', { name: /支付|解锁|pay/i }));

    // After pay, full result shows calorie and label
    await waitFor(() => screen.getByText(/1680/));
    expect(screen.getByText(/每日建议摄入|daily/i)).toBeTruthy();
  });

  it('clears the demo session and returns to the first screen when restarting', async () => {
    sessionStorage.setItem('bm_assessment_snapshot', JSON.stringify({
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: 'light',
    }));

    render(
      <MemoryRouter initialEntries={['/result']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/result" element={<ResultPage />} />
          <Route path="/" element={<div>Start page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole('button', { name: /支付|解锁|pay/i }));
    fireEvent.click(screen.getByRole('button', { name: /重新开始|restart/i }));

    expect(localStorage.getItem('bm_user_id')).toBeNull();
    expect(localStorage.getItem('bm_assessment_id')).toBeNull();
    expect(sessionStorage.getItem('bm_assessment_snapshot')).toBeNull();
    expect(await screen.findByText(/Start page/i)).toBeTruthy();
  });

  it('labels the membership action as a simulated demo unlock', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: /模拟解锁|demo unlock/i })).toBeTruthy();
  });

  it('shows a health disclaimer with the result', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(await screen.findByText(/仅供参考|医生|营养师/i)).toBeTruthy();
  });
});
