import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResultPage } from '../src/pages/ResultPage';
import * as client from '../src/lib/api-client';
import type { ResultResponse } from '../src/features/result/types';
import { clearPendingAssessmentSession } from '../src/features/assessment/assessment-session';

const maskedResponse: ResultResponse = {
  member: false,
  result: { bmi: 25.7, bmi_category: 'overweight', locked: true, message: '解锁完整报告查看每日建议摄入与目标达成日期' },
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

beforeEach(() => {
  localStorage.setItem('bm_user_id', 'u1');
  localStorage.setItem('bm_assessment_id', 'a1');
  sessionStorage.clear();
  const getResult = vi.spyOn(client.api, 'getResult');
  getResult.mockResolvedValueOnce(maskedResponse);
  getResult.mockResolvedValueOnce(fullResponse);
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
    status: 'completed',
  });
  vi.spyOn(client.api, 'submit').mockResolvedValue({ status: 'completed' });
  vi.spyOn(client.api, 'pay').mockResolvedValue(paymentResponse);
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

  it('prepares incomplete assessments before fetching the result', async () => {
    vi.mocked(client.api.getResult).mockReset();
    vi.mocked(client.api.getResult).mockResolvedValueOnce(maskedResponse);
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

    expect(await screen.findByRole('link', { name: /支付|解锁|pay/i })).toBeTruthy();
    expect(client.api.getProgress).toHaveBeenCalledWith('a1');
    expect(client.api.submit).toHaveBeenCalledWith('a1');
    expect(vi.mocked(client.api.getProgress).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(client.api.getResult).mock.invocationCallOrder[0],
    );
    expect(vi.mocked(client.api.submit).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(client.api.getResult).mock.invocationCallOrder[0],
    );
  });

  it('waits for the final background save before fetching the result', async () => {
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
    vi.mocked(client.api.getResult).mockResolvedValueOnce(maskedResponse);
    vi.spyOn(client.api, 'getProgress').mockResolvedValue({
      assessmentId: 'a1',
      userId: 'u1',
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: null,
      current_step: 12,
      status: 'in_progress',
    });

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    await waitFor(() => expect(client.api.getProgress).toHaveBeenCalledWith('a1'));
    expect(screen.getByRole('link', { name: /支付|解锁|pay/i })).toBeTruthy();
    expect(client.api.submit).not.toHaveBeenCalled();
    expect(client.api.getResult).not.toHaveBeenCalled();
  });

  it('prompts users to finish the assessment when required answers are missing', async () => {
    vi.mocked(client.api.getResult).mockReset();
    vi.spyOn(client.api, 'getProgress').mockResolvedValue({
      assessmentId: 'a1',
      userId: 'u1',
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: null,
      current_step: 12,
      status: 'in_progress',
    });

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(await screen.findByText(/请先完成测评/i)).toBeTruthy();
    expect(client.api.submit).not.toHaveBeenCalled();
    expect(client.api.getResult).not.toHaveBeenCalled();
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
    expect(await screen.findByRole('link', { name: /支付|解锁|pay/i })).toBeTruthy();
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
    expect(screen.getByRole('link', { name: /支付|解锁|pay/i })).toBeTruthy();
  });

  it('does not show full paid fields from local payment flags before the backend confirms membership', async () => {
    sessionStorage.setItem('bm_payment_unlocked', '1');
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

    expect(screen.queryByText(/会员已解锁/i)).toBeNull();
    expect(screen.queryByText(/1680/)).toBeNull();
    expect(screen.queryByText(/kcal/i)).toBeNull();
    expect(screen.getByRole('link', { name: /支付|解锁|pay/i })).toBeTruthy();
  });

  it('opens the dedicated pay page from the result call to action without charging directly', async () => {
    render(
      <MemoryRouter initialEntries={['/result']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/result" element={<ResultPage />} />
          <Route path="/pay" element={<div>Pay page route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('link', { name: /支付|解锁|pay/i }));

    expect(await screen.findByText(/Pay page route/i)).toBeTruthy();
    expect(client.api.pay).not.toHaveBeenCalled();
  });

  it('renders full result without a paywall when the backend says the user is a member', async () => {
    vi.mocked(client.api.getResult).mockReset();
    vi.mocked(client.api.getResult).mockResolvedValueOnce(fullResponse);

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(await screen.findByText(/1680/)).toBeTruthy();
    expect(screen.getByText('每日建议摄入')).toBeTruthy();
    expect(screen.getByText(/会员已解锁/i)).toBeTruthy();
    expect(screen.getByText(/28 天行动路径/i)).toBeTruthy();
    expect(screen.getByText(/每日执行重点/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /支付|解锁|pay/i })).toBeNull();
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

    await waitFor(() => screen.getByRole('link', { name: /支付|解锁|pay/i }));
    fireEvent.click(screen.getByRole('button', { name: /重新开始|restart/i }));

    expect(localStorage.getItem('bm_user_id')).toBeNull();
    expect(localStorage.getItem('bm_assessment_id')).toBeNull();
    expect(sessionStorage.getItem('bm_assessment_snapshot')).toBeNull();
    expect(await screen.findByText(/Start page/i)).toBeTruthy();
  });

  it('labels the paid action as the complete report unlock', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: /解锁完整报告与行动方案/i })).toBeTruthy();
  });

  it('shows a health disclaimer with the result', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResultPage /></MemoryRouter>);

    expect(await screen.findByText(/仅供参考|医生|营养师/i)).toBeTruthy();
  });
});
