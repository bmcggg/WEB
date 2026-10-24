import { test, expect } from '@playwright/test';

test.skip(process.env.FELLA_E2E_TEST_DATABASE !== '1', 'Set FELLA_E2E_TEST_DATABASE=1 only for an isolated test backend.');

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z2QAAAAASUVORK5CYII=', 'base64');

test('desktop: register, login, create, authenticated media, modal, edit, save, profile, delete', async ({ page, request }) => {
  const username = 'ui_' + Date.now();
  const password = 'FellaUiTest_42!';
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/register');
  await page.getByLabel('Họ và tên').fill('UI Test');
  await page.getByLabel('Tên người dùng (Username)').fill(username);
  await page.getByLabel('Địa chỉ Email').fill(username + '@example.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByPlaceholder('Username hoặc Email').fill(username);
  await page.getByPlaceholder('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/feed$/);
  const token = await page.evaluate(() => localStorage.getItem('fella_token'));
  const auth = { Authorization: 'Bearer ' + token };
  const imageFormats = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2; canvas.height = 2;
    const drawing = canvas.getContext('2d');
    drawing.fillStyle = '#1877f2'; drawing.fillRect(0, 0, 2, 2);
    return { jpeg: canvas.toDataURL('image/jpeg').split(',')[1], webp: canvas.toDataURL('image/webp').split(',')[1] };
  });
  await page.getByLabel('Chia sẻ với mọi người').fill('Bài viết UI ' + username);
  await page.locator('input[type=file]').setInputFiles([
    { name: 'photo.png', mimeType: 'image/png', buffer: image },
    { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(imageFormats.jpeg, 'base64') },
    { name: 'photo.webp', mimeType: 'image/webp', buffer: Buffer.from(imageFormats.webp, 'base64') },
    { name: 'document.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF\n') },
  ]);
  await expect(page.getByAltText('photo.png')).toBeVisible();
  await page.getByRole('button', { name: 'Đăng bài', exact: true }).click();
  const card = page.getByRole('article').filter({ hasText: 'Bài viết UI ' + username });
  await expect(card).toBeVisible();
  await expect(card.getByRole('img')).toHaveCount(3);
  for (const picture of await card.getByRole('img').all()) {
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
  }
  await page.screenshot({ path: 'test-results/feed-desktop.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await card.getByRole('button', { name: /Tải tài liệu PDF/ }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.pdf$/);
  await card.getByRole('button', { name: 'Xem chi tiết' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Bài viết UI ' + username, { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Xem chi tiết' })).toBeFocused();
  await card.getByRole('button', { name: 'Lưu bài', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Bỏ lưu' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Đã lưu', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bài viết đã lưu' })).toBeVisible();
  await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  await page.getByLabel('Nội dung', { exact: true }).fill('Nội dung đã sửa ' + username);
  await page.getByLabel('Ai được xem?', { exact: true }).selectOption('PRIVATE');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Nội dung đã sửa ' + username, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Nội dung đã sửa ' + username, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ lưu' }).click();
  await expect(page.getByText('Bạn chưa lưu bài viết nào còn quyền xem.')).toBeVisible();
  await page.goto('/profile');
  const edited = page.getByRole('article').filter({ hasText: 'Nội dung đã sửa ' + username });
  await expect(edited).toBeVisible();
  await edited.getByRole('button', { name: 'Xóa', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(edited).toHaveCount(0);
  const profile = await request.get('/api/posts/user/' + (await page.evaluate(() => JSON.parse(localStorage.getItem('fella_user')).id)), { headers: auth });
  expect((await profile.json()).data).toEqual([]);
  expect(failures).toEqual([]);
});

test('mobile: validation, error states, responsive layout and privacy with a second user', async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const suffix = Date.now();
  const accounts = [];
  for (const label of ['a', 'b']) {
    const username = 'mobile_' + suffix + label;
    const registered = await request.post('/api/auth/register', { data: { username, email: username + '@example.test', full_name: 'Mobile ' + label, password: 'UiTest_42!' } });
    expect(registered.status()).toBe(201);
    accounts.push(await (await request.post('/api/auth/login', { data: { account: username, password: 'UiTest_42!' } })).json());
  }
  const [alice, bob] = accounts;
  const auth = { Authorization: 'Bearer ' + alice.token };
  const created = await request.post('/api/posts', { headers: auth, multipart: { content: 'Mobile private ' + suffix, privacy: 'PRIVATE', media: { name: 'photo.png', mimeType: 'image/png', buffer: image } } });
  expect(created.status()).toBe(201);
  const post = (await created.json()).data;
  await page.goto('/login');
  await page.evaluate((account) => {
    localStorage.setItem('fella_token', account.token);
    localStorage.setItem('fella_user', JSON.stringify(account.user));
  }, bob);
  await page.goto('/feed');
  await expect(page.getByText(post.content, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Đăng bài', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Hãy nhập nội dung');
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.html', mimeType: 'text/html', buffer: Buffer.from('bad') });
  await expect(page.getByRole('alert')).toContainText('Chỉ hỗ trợ');
  const mobileText = 'Mobile UI ' + suffix + ' ' + 'x'.repeat(180);
  await page.getByLabel('Chia sẻ với mọi người').fill(mobileText);
  await page.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Đăng bài', exact: true }).click();
  const mobileCard = page.getByRole('article').filter({ hasText: mobileText });
  await expect(mobileCard).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mobileCard.getByRole('button', { name: 'Xem chi tiết' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => page.getByRole('dialog').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/post-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  await mobileCard.getByRole('button', { name: 'Xóa', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(mobileCard).toHaveCount(0);
  await page.goto('/profile?id=' + alice.user.id);
  await expect(page.getByText(post.content, { exact: true })).toHaveCount(0);
  const blocked = await request.get(post.media[0].media_url, { headers: { Authorization: 'Bearer ' + bob.token } });
  expect(blocked.status()).toBe(404);
  await request.delete('/api/posts/' + post.id, { headers: auth });
  await page.evaluate(() => localStorage.setItem('fella_token', 'invalid'));
  await page.goto('/feed');
  await expect(page).toHaveURL(/\/login$/);
});
