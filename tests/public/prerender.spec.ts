import { expect, test } from '@playwright/test';

test.describe('readable public pages without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('Khmer visitors can read and navigate the homepage and Cambodia guide', async ({ page }) => {
    await page.goto('/?lang=km');
    await expect(page.locator('h1')).toHaveText('កម្មវិធីតែមួយសម្រាប់កម្ពុជា');
    await page.getByRole('link', { name: 'English', exact: true }).click();
    await expect(page.locator('h1')).toHaveText('One app for Cambodia');
    await page.goto('/cambodia/siem-reap?lang=km');
    await expect(page.locator('html')).toHaveAttribute('lang', 'km');
    await expect(page.locator('h1')).toHaveText('មគ្គុទ្ទេសក៍ដំណើរនៅសៀមរាប');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://zivosmedia.com/cambodia/siem-reap');
    await expect(page.getByRole('link', { name: 'រៀបចំជើងហោះហើរ', exact: true })).toHaveAttribute('href', '/flights?to=SAI&lang=km');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
});
