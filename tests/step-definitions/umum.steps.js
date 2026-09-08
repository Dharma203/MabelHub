const { Given, When, Then } = require('@cucumber/cucumber');
const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Helper to get mongodb URI from env/file
function getMongodbUri() {
  let mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    const envPath = path.resolve('.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/MONGODB_URI\s*=\s*(.*)/);
      if (match) mongodbUri = match[1].trim().replace(/['"]/g, '');
    }
  }
  return mongodbUri || "mongodb://localhost:27017/MabelHub";
}

// --- Given Steps ---

Given('pengguna berada di halaman login', async function () {
  await this.navigateTo('/');
  await this.waitForPageContent();
  await this.driver.wait(
    until.elementLocated(By.css('input[placeholder="Username atau Email"]')),
    15000,
    'Timeout: Input username tidak ditemukan'
  );
  await this.driver.sleep(1500);
});

Given('pengguna telah login sebagai {string} dengan password {string}', async function (username, password) {
  await this.navigateTo('/');
  await this.waitForPageContent();

  const usernameInput = await this.driver.wait(
    until.elementLocated(By.css('input[placeholder="Username atau Email"]')),
    15000
  );
  await this.driver.sleep(1500);
  await usernameInput.clear();
  await this.setValueReact(usernameInput, username);

  const passwordInput = await this.driver.wait(
    until.elementLocated(By.css('#passwordInput')),
    15000
  );
  await passwordInput.clear();
  await this.setValueReact(passwordInput, password);

  const loginButton = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'LOGIN') or contains(text(),'Logging in')]")),
    15000
  );
  await this.driver.wait(until.elementIsEnabled(loginButton), 5000);
  await loginButton.click();

  // Tunggu redirect selesai
  await this.driver.wait(async () => {
    const currentUrl = await this.driver.getCurrentUrl();
    const url = new URL(currentUrl);
    return url.pathname !== '/';
  }, 20000, 'Timeout: Login redirect gagal');

  await this.waitForPageContent(30000);
});

// --- When Steps ---

When('pengguna mengisi username dengan {string}', async function (username) {
  const usernameInput = await this.driver.wait(
    until.elementLocated(By.css('input[placeholder="Username atau Email"]')),
    15000
  );
  await usernameInput.clear();
  await this.setValueReact(usernameInput, username);
});

When('pengguna mengisi password dengan {string}', async function (password) {
  const passwordInput = await this.driver.wait(
    until.elementLocated(By.css('#passwordInput')),
    15000
  );
  await passwordInput.clear();
  await this.setValueReact(passwordInput, password);
});

When('pengguna menekan tombol LOGIN', async function () {
  const loginButton = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'LOGIN') or contains(text(),'Logging in')]")),
    15000
  );
  await this.driver.wait(until.elementIsEnabled(loginButton), 5000);
  await loginButton.click();
});

When('pengguna mengakses halaman {string}', async function (pathName) {
  await this.navigateTo(pathName);
  await this.driver.sleep(2000);
  await this.waitForPageContent();
});

When('pengguna menekan tombol logout', async function () {
  const sidebar = await this.driver.wait(
    until.elementLocated(By.css('aside')),
    15000
  );
  await this.driver.actions().move({ origin: sidebar }).perform();
  await this.driver.sleep(1000);

  const logoutButton = await this.driver.wait(
    until.elementLocated(By.xpath("//aside//button[.//span[contains(text(),'LOGOUT')]]")),
    10000
  );
  await this.driver.executeScript("arguments[0].scrollIntoView(true);", logoutButton);
  await this.driver.sleep(500);
  await logoutButton.click();
  await this.driver.sleep(2000);
});

When('pengguna menekan tombol BACK di browser', async function () {
  await this.driver.navigate().back();
  await this.driver.sleep(2000);
});

When('sesi pengguna kedaluwarsa secara programmatik', async function () {
  await this.driver.manage().deleteAllCookies();
  await this.driver.sleep(1000);
});

When('pengguna mengklik ikon lonceng notifikasi pada header', async function () {
  // Hubungkan ke DB dan buat notifikasi untuk SUPERADMIN terlebih dahulu agar list tidak kosong!
  const uri = getMongodbUri();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("MabelHub");
    const superadmin = await db.collection("users").findOne({ username: "superadmin" });
    if (superadmin) {
      const adminId = superadmin.userId || superadmin._id.toString();
      await db.collection("notifications").deleteMany({ userId: adminId });
      await db.collection("notifications").insertOne({
        userId: adminId,
        title: "Request Instansi Baru",
        message: "cakiyos meminta penambahan instansi.",
        type: "REQUEST",
        isRead: false,
        link: "/instansi",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`[DB Seed Successful] Notification created for Superadmin: ${adminId}`);
    }
  } catch (err) {
    console.error(`[DB Notification Seed Failed]: ${err.message}`);
  } finally {
    await client.close();
  }

  const bell = await this.driver.wait(
    until.elementLocated(By.css('button[aria-label="Notifications"]')),
    15000
  );
  await this.driver.executeScript("arguments[0].scrollIntoView(true); arguments[0].click();", bell);
  await this.driver.sleep(1500);
});

When('pengguna mengklik pesan notifikasi teratas yang muncul', async function () {
  const notifItem = await this.driver.wait(
    until.elementLocated(By.css('div[class*="group"][class*="cursor-pointer"]')),
    15000,
    'Timeout: Notifikasi kosong atau tidak ditemukan'
  );
  await this.driver.executeScript("arguments[0].click();", notifItem);
  await this.driver.sleep(2000);
});

// --- Then Steps ---

Then('pengguna diarahkan ke halaman {string}', async function (expectedPath) {
  await this.driver.wait(async () => {
    const currentUrl = await this.driver.getCurrentUrl();
    return currentUrl.includes(expectedPath);
  }, 25000, `Timeout: URL tidak mengandung "${expectedPath}"`);

  const currentUrl = await this.driver.getCurrentUrl();
  expect(currentUrl).to.include(expectedPath);
});

Then('pesan error {string} ditampilkan', async function (expectedError) {
  await this.driver.wait(async () => {
    const pageSource = await this.driver.getPageSource();
    return pageSource.includes(expectedError);
  }, 15000, `Timeout: Pesan error "${expectedError}" tidak muncul`);

  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include(expectedError);
});

Then('pengguna diarahkan ke halaman login', async function () {
  await this.driver.wait(async () => {
    const currentUrl = await this.driver.getCurrentUrl();
    const url = new URL(currentUrl);
    return url.pathname === '/';
  }, 15000, 'Timeout: Pengguna tidak dialihkan ke login');

  const currentUrl = await this.driver.getCurrentUrl();
  const url = new URL(currentUrl);
  expect(url.pathname).to.equal('/');
});

Then('pengguna tetap diarahkan ke halaman login', async function () {
  await this.driver.wait(async () => {
    const currentUrl = await this.driver.getCurrentUrl();
    const url = new URL(currentUrl);
    return url.pathname === '/';
  }, 15000, 'Timeout: Pengguna tidak tetap dialihkan ke login');

  const currentUrl = await this.driver.getCurrentUrl();
  const url = new URL(currentUrl);
  expect(url.pathname).to.equal('/');
});

Then('halaman menampilkan form login', async function () {
  const usernameInput = await this.driver.wait(
    until.elementLocated(By.css('input[placeholder="Username atau Email"]')),
    15000
  );
  expect(await usernameInput.isDisplayed()).to.be.true;
});

Then('sidebar tidak menampilkan menu {string}', async function (menuLabel) {
  const sidebar = await this.driver.wait(
    until.elementLocated(By.css('aside')),
    15000
  );
  await this.driver.actions().move({ origin: sidebar }).perform();
  await this.driver.sleep(1000);
  
  const text = await sidebar.getText();
  expect(text).to.not.include(menuLabel);
});

Then('pengguna diarahkan ke halaman login atau dashboard', async function () {
  await this.driver.wait(async () => {
    const currentUrl = await this.driver.getCurrentUrl();
    const url = new URL(currentUrl);
    return url.pathname === '/' || url.pathname.includes('/dashboard');
  }, 15000, 'Timeout: Pengguna tidak dialihkan ke login atau dashboard');

  const currentUrl = await this.driver.getCurrentUrl();
  const url = new URL(currentUrl);
  const isValid = url.pathname === '/' || url.pathname.includes('/dashboard');
  expect(isValid).to.be.true;
});

Then('status notifikasi berubah menjadi sudah dibaca', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.not.include('Tandai dibaca');
});
