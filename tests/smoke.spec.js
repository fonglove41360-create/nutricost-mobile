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

test('FEFO purchase cost, meal stock deduction and deletion restore', async ({page}) => {
 await page.locator('[data-tab="inventory"]').click();
 await page.locator('#lotFood').selectOption('f0');
 await page.locator('#lotQty').fill('300');
 await page.locator('#lotPrice').fill('100');
 await page.locator('#lotExpiry').fill('2026-11-15');
 await page.getByRole('button',{name:/บันทึกล็อตใหม่/}).click();
 await page.locator('#lotFood').selectOption('f0');
 await page.locator('#lotQty').fill('300');
 await page.locator('#lotPrice').fill('150');
 await page.locator('#lotExpiry').fill('2026-11-01');
 await page.getByRole('button',{name:/บันทึกล็อตใหม่/}).click();
 await page.locator('[data-tab="meals"]').click();
 await page.locator('#addFood').selectOption('f0');
 await page.locator('#eatQty').fill('100');
 await page.getByRole('button',{name:/เพิ่มวัตถุดิบในมื้อ/}).click();
 await expect(page.locator('#meals')).toContainText('฿50.00');
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:/บันทึกมื้อและหักสต็อก/}).click();
 await expect(page.locator('#avail')).toContainText('500');
 await expect(page.locator('#meals')).toContainText('฿50.00');
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:/ลบและคืนสต็อก/}).click();
 await expect(page.locator('#avail')).toContainText('600');
});
test('insufficient stock does not allow adding draft', async ({page}) => {
 await page.locator('[data-tab="inventory"]').click();
 await page.locator('#lotFood').selectOption('f0');
 await page.locator('#lotQty').fill('50');
 await page.locator('#lotPrice').fill('100');
 await page.getByRole('button',{name:/บันทึกล็อตใหม่/}).click();
 await page.locator('[data-tab="meals"]').click();
 await page.locator('#addFood').selectOption('f0');
 await page.locator('#eatQty').fill('100');
 page.once('dialog',async d=>{expect(d.message()).toContain('สต็อกไม่เพียงพอ');await d.accept()});
 await page.getByRole('button',{name:/เพิ่มวัตถุดิบในมื้อ/}).click();
 await expect(page.locator('#meals')).toContainText('เลือกวัตถุดิบด้านบนเพื่อเริ่ม');
});
