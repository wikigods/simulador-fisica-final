import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to a large size to capture everything
  await page.setViewportSize({ width: 1280, height: 1200 });

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173/simulador-fisica/');

  console.log('Waiting for Projectile Motion card...');
  // Use data-sim attribute which is robust
  await page.click('.sim-card[data-sim="projectile-motion"]');

  console.log('Waiting for canvas...');
  await page.waitForSelector('#projectile-motion-canvas');

  // Wait for p5 to initialize
  await page.waitForTimeout(2000);

  console.log('Firing projectile...');
  // Click "¡Disparar!" button.
  const canvas = await page.$('#projectile-motion-canvas');
  const box = await canvas.boundingBox();

  // X: 0.8 * width, Y: height - 30 (button center)
  // Let's assume the button is correctly rendered.
  const clickX = box.x + box.width * 0.8;
  const clickY = box.y + box.height - 30;

  await page.mouse.click(clickX, clickY);

  console.log('Waiting for projectile to land...');
  await page.waitForTimeout(4000);

  console.log('Dragging trajectory meter...');
  const startX = box.x + box.width * 0.5;
  const startY = box.y + box.height * 0.5;

  // Drag to a point where trajectory likely exists (middle of flight)
  // Apex is around x=0.45*w, y=middle.
  const endX = box.x + box.width * 0.45;
  const endY = box.y + box.height * 0.4;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();

  // Wait a bit
  await page.waitForTimeout(1000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'scratch/verification/before.png' });

  await browser.close();
})();
