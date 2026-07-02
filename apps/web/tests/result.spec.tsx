import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResultPage } from '../src/pages/ResultPage';
import * as client from '../src/lib/api-client';
import type { ResultResponse } from '../src/features/result/types';

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
  const getResult = vi.spyOn(client.api, 'getResult');
  getResult.mockResolvedValueOnce(maskedResponse);
  getResult.mockResolvedValueOnce(fullResponse);
  vi.spyOn(client.api, 'pay').mockResolvedValue({ status: 'active' });
});

describe('ResultPage', () => {
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
});
