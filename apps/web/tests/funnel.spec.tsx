import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FunnelPage } from '../src/pages/FunnelPage';
import { PayPage } from '../src/pages/PayPage';
import { ResultPage } from '../src/pages/ResultPage';
import * as client from '../src/lib/api-client';
import { clearPendingAssessmentSession } from '../src/features/assessment/assessment-session';

interface AssessmentSession {
  userId: string;
  assessmentId: string;
  currentStep: number;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(client.api, 'createAssessment').mockResolvedValue({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });
  vi.spyOn(client.api, 'saveStep').mockResolvedValue({} as never);
});

afterEach(() => {
  cleanup();
  clearPendingAssessmentSession();
  vi.restoreAllMocks();
});

async function choose(name: RegExp) {
  fireEvent.click(await screen.findByRole('button', { name }));
}

async function fillBodyData() {
  fireEvent.change(await screen.findByLabelText(/年龄/i), { target: { value: '28' } });
  fireEvent.click(screen.getByRole('button', { name: /继续/i }));
  fireEvent.change(await screen.findByLabelText(/身高/i), { target: { value: '165' } });
  fireEvent.click(screen.getByRole('button', { name: /继续/i }));
  fireEvent.change(await screen.findByLabelText(/当前体重/i), { target: { value: '70' } });
  fireEvent.click(screen.getByRole('button', { name: /继续/i }));
  fireEvent.change(await screen.findByLabelText(/目标体重/i), { target: { value: '60' } });
  fireEvent.click(screen.getByRole('button', { name: /继续/i }));
}

async function completeFunnel() {
  await choose(/有兴趣，还没开始/i);
  await screen.findByRole('heading', { name: /你更希望通过普拉提改善什么/i });
  await choose(/瘦下来/i);
  await screen.findByRole('heading', { name: /你觉得自己现在的身材/i });
  await choose(/腰腹容易囤肉/i);
  await screen.findByRole('heading', { name: /你最想先改善哪个部位/i });
  await choose(/^01\s*小腹/i);
  await screen.findByRole('heading', { name: /你期待自己的身材/i });
  await choose(/^02\s*腰腹紧致/i);
  await screen.findByRole('heading', { name: /你希望多久看到变化/i });
  await choose(/28 天形成明显改善/i);
  await screen.findByRole('heading', { name: /你的性别是/i });
  await choose(/女性/i);
    await screen.findByRole('heading', { name: /你的年龄是/i });
    await fillBodyData();
  await screen.findByRole('heading', { name: /你现在每周运动几次/i });
  await choose(/1-2 次/i);
  await screen.findByRole('heading', { name: /你最容易卡在哪一步/i });
  await choose(/不知道怎么练/i);
}

describe('FunnelPage', () => {
  it('starts with a Pilates interest question', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: /你平时喜欢普拉提吗/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /有兴趣，还没开始/i })).toBeTruthy();
  });

  it('auto-advances after a choice is selected', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);

    await choose(/有兴趣，还没开始/i);

    expect(await screen.findByRole('heading', { name: /你更希望通过普拉提改善什么/i })).toBeTruthy();
  });

  it('does not show a side insight card after selecting an answer', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /有兴趣，还没开始/i }));

    expect(screen.queryByText(/你的测评正在变得更准确/i)).toBeNull();
  });

  it('asks basic information one field at a time', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);

    await choose(/有兴趣，还没开始/i);
    await screen.findByRole('heading', { name: /你更希望通过普拉提改善什么/i });
    await choose(/瘦下来/i);
    await screen.findByRole('heading', { name: /你觉得自己现在的身材/i });
    await choose(/腰腹容易囤肉/i);
    await screen.findByRole('heading', { name: /你最想先改善哪个部位/i });
    await choose(/^01\s*小腹/i);
    await screen.findByRole('heading', { name: /你期待自己的身材/i });
    await choose(/^02\s*腰腹紧致/i);
    await screen.findByRole('heading', { name: /你希望多久看到变化/i });
    await choose(/28 天形成明显改善/i);
    await screen.findByRole('heading', { name: /你的性别是/i });
    await choose(/女性/i);

    expect(await screen.findByRole('heading', { name: /你的年龄是/i })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /再补充几个基础数据/i })).toBeNull();
  });

  it('shows a friendly validation message for out-of-range age', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);

    await choose(/有兴趣，还没开始/i);
    await screen.findByRole('heading', { name: /你更希望通过普拉提改善什么/i });
    await choose(/瘦下来/i);
    await screen.findByRole('heading', { name: /你觉得自己现在的身材/i });
    await choose(/腰腹容易囤肉/i);
    await screen.findByRole('heading', { name: /你最想先改善哪个部位/i });
    await choose(/^01\s*小腹/i);
    await screen.findByRole('heading', { name: /你期待自己的身材/i });
    await choose(/^02\s*腰腹紧致/i);
    await screen.findByRole('heading', { name: /你希望多久看到变化/i });
    await choose(/28 天形成明显改善/i);
    await screen.findByRole('heading', { name: /你的性别是/i });
    await choose(/女性/i);

    fireEvent.change(await screen.findByLabelText(/年龄/i), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /继续/i }));

    expect(screen.getByRole('alert').textContent).toContain('年龄请填写 13 到 120 之间的整数');
  });

  it('renders the first step immediately while creating a session in the background', async () => {
    vi.mocked(client.api.createAssessment).mockReturnValue(new Promise<AssessmentSession>(() => undefined));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);

    expect(await screen.findByText(/你平时喜欢普拉提吗/i)).toBeTruthy();
  });

  it('queues save until background session creation completes', async () => {
    let resolveSession: (value: AssessmentSession) => void;
    vi.mocked(client.api.createAssessment).mockReturnValue(new Promise((resolve) => {
      resolveSession = resolve;
    }));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);
    await choose(/有兴趣，还没开始/i);

    expect(await screen.findByRole('heading', { name: /你更希望通过普拉提改善什么/i })).toBeTruthy();
    expect(client.api.saveStep).not.toHaveBeenCalled();

    resolveSession!({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });
    await waitFor(() => expect(client.api.saveStep).toHaveBeenCalledWith('a1', { current_step: 1 }));
  });

  it('saves mapped backend fields when the selected answer needs them', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);

    await choose(/有兴趣，还没开始/i);
    await choose(/瘦下来/i);

    await waitFor(() => expect(client.api.saveStep).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ primary_goal: 'lose_weight', current_step: 2 }),
    ));
  });

  it('advances to the next step immediately while saving in the background', async () => {
    vi.mocked(client.api.saveStep).mockReturnValue(new Promise(() => undefined));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);
    await choose(/有兴趣，还没开始/i);

    expect(await screen.findByRole('heading', { name: /你更希望通过普拉提改善什么/i })).toBeTruthy();
  });

  it('shows a recoverable save error when background save fails', async () => {
    vi.mocked(client.api.saveStep).mockRejectedValueOnce(new Error('save failed'));

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);
    await choose(/有兴趣，还没开始/i);

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

    await completeFunnel();

    expect(await screen.findByText(/Result route ready/i)).toBeTruthy();
  });

  it('shows a result preview when navigation happens before the assessment session resolves', async () => {
    vi.mocked(client.api.createAssessment).mockReturnValue(new Promise<AssessmentSession>(() => undefined));
    vi.spyOn(client.api, 'getResult').mockRejectedValue(new Error('result not ready'));

    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<FunnelPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await completeFunnel();

    expect(await screen.findByText(/BMI/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /解锁|领取|完整报告/i })).toBeTruthy();
    expect(screen.queryByText(/请先完成测评|Start assessment first/i)).toBeNull();
  });

  it('coalesces rapid answers into one latest save before submitting', async () => {
    let resolveSession: (value: AssessmentSession) => void;
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

    await completeFunnel();
    expect(await screen.findByText(/Result route ready/i)).toBeTruthy();
    resolveSession!({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });

    await waitFor(() => expect(client.api.saveStep).toHaveBeenCalledTimes(1));
    expect(client.api.saveStep).toHaveBeenCalledWith('a1', {
      current_step: 13,
      primary_goal: 'lose_weight',
      gender: 'female',
      age: 28,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 60,
      workout_frequency: 'light',
    });
    await waitFor(() => expect(client.api.submit).toHaveBeenCalledWith('a1'));
  });

  it('waits for the pending assessment session before paying from the preview', async () => {
    let resolveSession: (value: AssessmentSession) => void;
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
          <Route path="/pay" element={<PayPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await completeFunnel();

    fireEvent.click(await screen.findByRole('link', { name: /解锁|领取|完整报告/i }));
    expect(await screen.findByRole('heading', { name: /完整报告付费确认/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /确认支付|立即解锁/i }));
    expect(client.api.pay).not.toHaveBeenCalled();

    resolveSession!({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });

    await waitFor(() => expect(client.api.pay).toHaveBeenCalledWith('u1', 'a1'));
  });
});
