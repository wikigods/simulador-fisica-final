import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1280, height: 1200 });

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173/simulador-fisica/');

  await page.click('.sim-card[data-sim="projectile-motion"]');
  await page.waitForSelector('#projectile-motion-canvas');
  await page.waitForTimeout(2000);

  const canvas = await page.$('#projectile-motion-canvas');
  const box = await canvas.boundingBox();

  // 1. Try to set Angle to 0
  console.log('Setting angle to 0...');
  // The user might use the slider or drag the cannon.
  // Let's set the input directly to verify the constraint logic allows it (or fails)
  // We can't easily drag to exactly 0 with mouse in canvas without knowing the pivot perfectly,
  // but we can try setting the slider value which triggers the input event.
  await page.fill('#launch-angle-input', '0');
  // Trigger input event if needed (Playwright fill usually does, but let's be sure)
  await page.dispatchEvent('#launch-angle-input', 'input');
  await page.waitForTimeout(500);

  // 2. Move Target and Meter to overlap
  console.log('Moving target and meter...');

  // Target start: 0.75 * w
  const targetX = box.x + box.width * 0.75;
  const targetY = box.y + box.height - 35; // Rough Y

  // Meter start: 0.5 * w, 0.5 * h
  const meterX = box.x + box.width * 0.5;
  const meterY = box.y + box.height * 0.5;

  // Move Meter TO Target
  await page.mouse.move(meterX, meterY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY - 20, { steps: 10 }); // Slightly above target center
  await page.mouse.up();

  // 3. Fire
  console.log('Firing...');
  const fireBtnX = box.x + box.width * 0.8;
  const fireBtnY = box.y + box.height - 30;
  await page.mouse.click(fireBtnX, fireBtnY);
  await page.waitForTimeout(1000);

  // 4. Click Restart
  console.log('Clicking Restart...');
  const resetBtnX = box.x + box.width * 0.5; // Center button
  const resetBtnY = box.y + box.height - 30;
  await page.mouse.click(resetBtnX, resetBtnY);
  await page.waitForTimeout(1000);

  // Take screenshot to see if Target/Meter moved back
  await page.screenshot({ path: 'scratch/verification/before_restart.png' });

  // 5. Interaction Check (Visualized in Before state logic)
  // If we were to drag the meter now (which is over the target), does the target move?
  // We can try to drag the meter away. If target moves, it's fail.
  // Move mouse to overlap position
  await page.mouse.move(targetX, targetY - 20);
  await page.mouse.down();
  // Drag left
  await page.mouse.move(targetX - 100, targetY - 20, { steps: 10 });
  await page.mouse.up();

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scratch/verification/before_drag.png' });

  await browser.close();
})();
