import { test, expect } from '@playwright/test';

test('funnel to paywall to unlock', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /你平时喜欢普拉提吗/ })).toBeVisible();
  await page.getByRole('button', { name: /喜欢，想坚持下去/ }).click();
  await expect(page.getByRole('heading', { name: /你更希望通过普拉提改善什么/ })).toBeVisible();

  await page.getByRole('button', { name: /瘦下来/ }).click();
  await expect(page.getByRole('heading', { name: /你觉得自己现在的身材更接近哪一种/ })).toBeVisible();

  await page.getByRole('button', { name: /整体偏胖/ }).click();
  await expect(page.getByRole('heading', { name: /你最想先改善哪个部位/ })).toBeVisible();

  await page.getByRole('button', { name: /小腹/ }).click();
  await expect(page.getByRole('heading', { name: /你期待自己的身材更接近哪种状态/ })).toBeVisible();

  await page.getByRole('button', { name: /轻盈显瘦/ }).click();
  await expect(page.getByRole('heading', { name: /你希望多久看到变化/ })).toBeVisible();

  await page.getByRole('button', { name: /28 天形成明显改善/ }).click();
  await expect(page.getByRole('heading', { name: /你的性别是/ })).toBeVisible();

  await page.getByRole('button', { name: /女性/ }).click();
  await expect(page.getByRole('heading', { name: /你的年龄是/ })).toBeVisible();

  await page.getByLabel(/年龄|age/i).fill('28');
  await page.getByRole('button', { name: /继续/ }).click();
  await expect(page.getByRole('heading', { name: /你的身高是/ })).toBeVisible();

  await page.getByLabel(/身高/i).fill('165');
  await page.getByRole('button', { name: /继续/ }).click();
  await expect(page.getByRole('heading', { name: /你现在的体重是多少/ })).toBeVisible();

  await page.getByLabel(/当前体重/i).fill('70');
  await page.getByRole('button', { name: /继续/ }).click();
  await expect(page.getByRole('heading', { name: /你的目标体重是多少/ })).toBeVisible();

  await page.getByLabel(/目标体重/i).fill('75');
  await page.getByRole('button', { name: /继续/ }).click();
  await expect(page.getByRole('heading', { name: /你现在每周运动几次/ })).toBeVisible();

  await page.getByRole('button', { name: /1-2 次/ }).click();
  await expect(page.getByRole('heading', { name: /你最容易卡在哪一步/ })).toBeVisible();

  await page.getByRole('button', { name: /不知道怎么练/ }).click();

  // Wait for navigation to result page (submit calls live Supabase, can be slow)
  await page.waitForURL('**/result', { timeout: 60_000 });

  // Result page: should be masked (paywall visible)
  await expect(page.getByRole('link', { name: /解锁完整报告与行动方案/ })).toBeVisible();

  // Negative assertion: "kcal" unit only appears in the unlocked member result,
  // never in the paywall teaser copy — so it is the correct masking discriminator.
  await expect(page.getByText(/kcal/i)).not.toBeVisible();

  await page.getByRole('link', { name: /解锁完整报告与行动方案/ }).click();
  await expect(page.getByRole('heading', { name: /完整报告付费确认/ })).toBeVisible();

  await page.getByRole('button', { name: /确认支付|立即解锁/i }).click();
  await page.waitForURL('**/result', { timeout: 60_000 });

  // Full result should now be visible (after pay + reload from live DB)
  await expect(page.getByText(/会员已解锁/)).toBeVisible();
  await expect(page.getByText(/28 天行动路径/)).toBeVisible();
  await expect(page.getByText(/kcal/i)).toBeVisible();
});
