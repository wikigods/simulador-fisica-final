import { test, expect } from '@playwright/test';

test('reproduce projectile motion issue', async ({ page }) => {
  // Increase viewport height to capture full canvas
  await page.setViewportSize({ width: 1280, height: 1200 });

  await page.goto('http://localhost:5173/simulador-fisica/');

  // Navigate to Projectile Motion
  await page.click('[data-sim="projectile-motion"]');

  // Wait for canvas to be visible
  await page.waitForSelector('#projectile-motion-canvas canvas');

  // Wait a bit for initialization and ensuring p5 is ready
  await page.waitForTimeout(2000);

  // Get canvas element handle
  const canvas = page.locator('#projectile-motion-canvas canvas');
  const box = await canvas.boundingBox();

  // Button "¡Disparar!" is at x: 0.6 * width, y: height - 30.
  // We need to click there relative to the viewport.
  const clickX = box.x + box.width * 0.6;
  const clickY = box.y + box.height - 30;

  console.log(`Clicking at ${clickX}, ${clickY}`);

  // Click the button
  await page.mouse.click(clickX, clickY);

  // Wait for projectile to land (flight time ~1.5s - 2s)
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'scratch/verification/after_fix.png', fullPage: true });
});
