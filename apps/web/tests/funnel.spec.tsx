import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FunnelPage } from '../src/pages/FunnelPage';
import * as client from '../src/lib/api-client';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(client.api, 'createAssessment').mockResolvedValue({ userId: 'u1', assessmentId: 'a1', currentStep: 0 });
  vi.spyOn(client.api, 'saveStep').mockResolvedValue({} as never);
});

describe('FunnelPage', () => {
  it('renders the gender step first and saves on next', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FunnelPage /></MemoryRouter>);
    await waitFor(() => screen.getByText(/性别|gender/i));
    fireEvent.click(screen.getByRole('button', { name: /女|female/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一步|next/i }));
    await waitFor(() => expect(client.api.saveStep).toHaveBeenCalledWith('a1', { gender: 'female', current_step: 1 }));
  });
});
