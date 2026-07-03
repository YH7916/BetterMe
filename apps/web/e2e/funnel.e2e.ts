import { test, expect } from '@playwright/test';

test('funnel to paywall to unlock', async ({ page }) => {
  await page.goto('/');

  // Step 0: Gender
  await page.getByRole('button', { name: /女|female/i }).click();
  await page.getByRole('button', { name: /下一步|next/i }).click();

  // Step 1: Goal
  await page.getByRole('button', { name: /减脂|lose/i }).click();
  await page.getByRole('button', { name: /下一步|next/i }).click();

  // Step 2: Body
  await page.getByLabel(/年龄|age/i).fill('28');
  await page.getByLabel(/身高|height/i).fill('165');
  await page.getByLabel(/体重|weight/i).first().fill('70');
  await page.getByLabel(/目标体重|target/i).fill('60');
  await page.getByRole('button', { name: /下一步|next/i }).click();

  // Step 3: Frequency — final step triggers submit + navigate to /result
  await page.getByRole('button', { name: /轻度|light/i }).click();
  await page.getByRole('button', { name: /下一步|next|完成/i }).click();

  // Wait for navigation to result page (submit calls live Supabase, can be slow)
  await page.waitForURL('**/result', { timeout: 60_000 });

  // Result page: should be masked (paywall visible)
  await expect(page.getByText(/解锁|升级|unlock/i).first()).toBeVisible();

  // Negative assertion: "kcal" unit only appears in the unlocked member result,
  // never in the paywall teaser copy — so it is the correct masking discriminator.
  await expect(page.getByText(/kcal/i)).not.toBeVisible();

  // Pay to unlock
  await page.getByRole('button', { name: /支付|解锁|pay/i }).click();

  // Wait for paywall to disappear (pay API + reload must complete before asserting)
  await expect(page.getByText(/解锁你的完整计划/i)).not.toBeVisible({ timeout: 30_000 });

  // Full result should now be visible (after pay + reload from live DB)
  await expect(page.getByText(/kcal/i)).toBeVisible();
  await expect(page.getByText(/\d{3,4}/).first()).toBeVisible();
});
