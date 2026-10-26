const { test, expect } = require('@playwright/test');
test.beforeEach(async ({page}) => { await page.goto('/'); await page.evaluate(() => localStorage.clear()); await page.reload(); });
test('dashboard loads', async ({page}) => { await expect(page.locator('#dashboard')).toBeVisible(); });
test('theme settings persist across reload', async ({page}) => {
 await page.getByRole('button',{name:'ปรับแต่งธีมและฟอนต์'}).click();
 await page.locator('[data-theme="midnight"]').click();
 await expect(page.locator('html')).toHaveAttribute('data-nc-theme','midnight');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-nc-theme','midnight');
});
test('inventory and meal views open', async ({page}) => {
 await page.locator('[data-tab="inventory"]').click();
 await expect(page.locator('#lotQty')).toBeVisible();
 await page.locator('[data-tab="meals"]').click();
 await expect(page.locator('#eatQty')).toBeVisible();
});
