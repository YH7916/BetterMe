import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FunnelPage } from '../src/pages/FunnelPage';
import { ResultPage } from '../src/pages/ResultPage';
import * as client from '../src/lib/api-client';
import { clearPendingAssessmentSession } from '../src/features/assessment/assessment-session';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(client.api, 'createAssessment').mockResolvedValue({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });
  vi.spyOn(client.api, 'saveStep').mockResolvedValue({} as never);
});

afterEach(() => {
  cleanup();
  clearPendingAssessmentSession();
  vi.restoreAllMocks();
});

describe('FunnelPage', () => {
  it('renders the first step immediately while creating a session in the background', async () => {
    vi.mocked(client.api.createAssessment).mockReturnValue(new Promise(() => undefined));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);

    expect(await screen.findByText(/性别|gender/i)).toBeTruthy();
  });

  it('queues save until background session creation completes', async () => {
    let resolveSession: (value: { userId: string; assessmentId: string; currentStep: number }) => void;
    vi.mocked(client.api.createAssessment).mockReturnValue(new Promise((resolve) => {
      resolveSession = resolve;
    }));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);
    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));

    expect(await screen.findByRole('heading', { name: /目标/i })).toBeTruthy();
    expect(client.api.saveStep).not.toHaveBeenCalled();

    resolveSession!({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });
    await waitFor(() => expect(client.api.saveStep).toHaveBeenCalledWith('a1', { gender: 'female', current_step: 1 }));
  });

  it('renders the gender step first and saves on next', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);
    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    await waitFor(() => expect(client.api.saveStep).toHaveBeenCalledWith('a1', { gender: 'female', current_step: 1 }));
  });

  it('advances to the next step immediately while saving in the background', async () => {
    vi.mocked(client.api.saveStep).mockReturnValue(new Promise(() => undefined));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);
    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));

    expect(await screen.findByRole('heading', { name: /目标/i })).toBeTruthy();
  });

  it('shows a recoverable save error when background save fails', async () => {
    vi.mocked(client.api.saveStep).mockRejectedValueOnce(new Error('save failed'));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);
    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));

    expect(await screen.findByText(/保存失败|save failed/i)).toBeTruthy();
  });

  it('navigates to the result page immediately after the final step while saving continues', async () => {
    vi.mocked(client.api.saveStep).mockReturnValue(new Promise(() => undefined));

    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<FunnelPage />} />
          <Route path="/result" element={<div>Result route ready</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /减脂|lose/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.change(await screen.findByLabelText(/年龄|age/i), { target: { value: '28' } });
    fireEvent.change(screen.getByLabelText(/身高|height/i), { target: { value: '165' } });
    fireEvent.change(screen.getByLabelText('体重 / Weight (kg)'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/目标体重|target/i), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /轻度|light/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next|完成/i }));

    expect(await screen.findByText(/Result route ready/i)).toBeTruthy();
  });

  it('shows a result preview when navigation happens before the assessment session resolves', async () => {
    vi.mocked(client.api.createAssessment).mockReturnValue(new Promise(() => undefined));
    vi.spyOn(client.api, 'getResult').mockRejectedValue(new Error('result not ready'));

    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<FunnelPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /减脂|lose/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.change(await screen.findByLabelText(/年龄|age/i), { target: { value: '28' } });
    fireEvent.change(screen.getByLabelText(/身高|height/i), { target: { value: '165' } });
    fireEvent.change(screen.getByLabelText('体重 / Weight (kg)'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/目标体重|target/i), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /轻度|light/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next|完成/i }));

    expect(await screen.findByText(/BMI/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /支付|解锁|pay/i })).toBeTruthy();
    expect(screen.queryByText(/请先完成测评|Start assessment first/i)).toBeNull();
  });

  it('coalesces rapid answers into one latest save before submitting', async () => {
    let resolveSession: (value: { userId: string; assessmentId: string; currentStep: number }) => void;
    vi.mocked(client.api.createAssessment).mockReturnValue(new Promise((resolve) => {
      resolveSession = resolve;
    }));
    vi.spyOn(client.api, 'submit').mockResolvedValue({ status: 'completed' });

    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<FunnelPage />} />
          <Route path="/result" element={<div>Result route ready</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /减脂|lose/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.change(await screen.findByLabelText(/年龄|age/i), { target: { value: '28' } });
    fireEvent.change(screen.getByLabelText(/身高|height/i), { target: { value: '165' } });
    fireEvent.change(screen.getByLabelText('体重 / Weight (kg)'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/目标体重|target/i), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /轻度|light/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next|完成/i }));

    resolveSession!({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });

    await waitFor(() => expect(client.api.saveStep).toHaveBeenCalledTimes(1));
    expect(client.api.saveStep).toHaveBeenCalledWith('a1', {
      gender: 'female',
      primary_goal: 'lose_weight',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: 'light',
      current_step: 4,
    });
    await waitFor(() => expect(client.api.submit).toHaveBeenCalledWith('a1'));
  });

  it('waits for the pending assessment session before paying from the preview', async () => {
    let resolveSession: (value: { userId: string; assessmentId: string; currentStep: number }) => void;
    vi.mocked(client.api.createAssessment).mockReturnValue(new Promise((resolve) => {
      resolveSession = resolve;
    }));
    vi.spyOn(client.api, 'getResult').mockRejectedValue(new Error('result not ready'));
    vi.spyOn(client.api, 'getProgress').mockReturnValue(new Promise(() => undefined));
    vi.spyOn(client.api, 'pay').mockResolvedValue({ status: 'active' });

    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<FunnelPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /减脂|lose/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.change(await screen.findByLabelText(/年龄|age/i), { target: { value: '28' } });
    fireEvent.change(screen.getByLabelText(/身高|height/i), { target: { value: '165' } });
    fireEvent.change(screen.getByLabelText('体重 / Weight (kg)'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/目标体重|target/i), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: /轻度|light/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next|完成/i }));

    fireEvent.click(await screen.findByRole('button', { name: /支付|解锁|pay/i }));
    expect(client.api.pay).not.toHaveBeenCalled();

    resolveSession!({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });

    await waitFor(() => expect(client.api.pay).toHaveBeenCalledWith('u1', 'a1'));
  });
});
