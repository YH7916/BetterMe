import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { userRepo } from '../../src/repositories/user.repository';
import { assessmentRepo } from '../../src/repositories/assessment.repository';

async function resetDb() {
  await prisma.assessmentResult.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}

describe('assessmentRepo', () => {
  beforeEach(resetDb);
  it('creates and reads back an assessment', async () => {
    const user = await userRepo.create();
    const a = await assessmentRepo.create(user.id);
    const found = await assessmentRepo.findById(a.id);
    expect(found?.userId).toBe(user.id);
    expect(found?.currentStep).toBe(0);
  });
  it('patches incremental fields', async () => {
    const user = await userRepo.create();
    const a = await assessmentRepo.create(user.id);
    await assessmentRepo.patch(a.id, { gender: 'male', age: 30, current_step: 1 });
    const found = await assessmentRepo.findById(a.id);
    expect(found?.gender).toBe('male');
    expect(found?.currentStep).toBe(1);
  });
});
