const { test, expect } = require('@playwright/test');
test('loads', async ({ page }) => { await page.goto('/'); await expect(page.locator('#dashboard')).toBeVisible(); });
