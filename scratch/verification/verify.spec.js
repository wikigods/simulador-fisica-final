import { test, expect } from '@playwright/test';

test('Verify projectile motion angle display', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5173/simulador-fisica/');

  // Wait for the app to load
  await page.waitForTimeout(2000);

  // Click on Projectile Motion card
  await page.locator('.card[data-sim="projectile-motion"]').click();

  // Wait for canvas to load
  await page.waitForSelector('#projectile-motion-canvas');
  await page.waitForTimeout(1000); // Wait for p5 to initialize

  // Take a screenshot of the initial state
  await page.screenshot({ path: 'scratch/verification/final_proof.png' });
});
