const { When, Then } = require('@cucumber/cucumber');
const { By, until, Key } = require('selenium-webdriver');
const { expect } = require('chai');

/**
 * Precise React Select helper.
 * Finds the input directly via label/following-sibling, types value to filter, then presses ENTER.
 */
async function selectReactSelectByLabel(driver, labelText, value) {
  const input = await driver.wait(until.elementLocated(
    By.xpath(`//label[contains(text(), '${labelText}')]/following-sibling::div//input`)
  ), 15000);

  await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", input);
  await driver.sleep(300);
  await input.click();
  await driver.sleep(800);

  await input.sendKeys(value);
  await driver.sleep(1500);

  await input.sendKeys(Key.ENTER);
  await driver.sleep(800);
}

When('pengguna mengklik tombol "ADD PLANS" atau diarahkan ke halaman tambah rencana', async function () {
  try {
    const addPlansBtn = await this.driver.findElement(By.xpath("//button[contains(text(),'ADD PLANS') or contains(text(),'Add Plans')]"));
    await addPlansBtn.click();
  } catch (e) {
    await this.navigateTo('/plan-activity/add');
  }
  await this.driver.sleep(2000);
  await this.waitForPageContent();
});

When('pengguna mengisi tanggal rencana kunjungan', async function () {
  const dateInput = await this.driver.wait(
    until.elementLocated(By.css('input[type="date"]')),
    15000
  );
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  await this.driver.executeScript(
    "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
    dateInput,
    todayStr
  );
  await this.driver.sleep(1000);
});

When('pengguna memilih Status Ring ke-1 dengan nilai {string}', async function (ringValue) {
  await selectReactSelectByLabel(this.driver, "Status Ring", ringValue);
});

When('pengguna mengetik institusi ke-1 dengan nilai {string}', async function (institusiName) {
  // Placeholder di plan-activity/add: "Ketik untuk mencari institusi..."
  const institusiInput = await this.driver.wait(
    until.elementLocated(By.css('input[placeholder*="Ketik untuk mencari"]')),
    15000
  );
  await institusiInput.clear();
  await this.setValueReact(institusiInput, institusiName);
  await this.driver.sleep(1000);
});

When('pengguna menekan tombol simpan rencana "SIMPAN DATA" atau "Submit"', async function () {
  const saveBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'SIMPAN DATA') or contains(text(),'SIMPAN SEMUA RENCANA') or contains(text(),'Submit')]")),
    15000
  );
  await this.driver.executeScript("arguments[0].scrollIntoView(true);", saveBtn);
  await this.driver.sleep(500);
  await saveBtn.click();

  try {
    await this.driver.wait(until.alertIsPresent(), 10000);
    const alert = await this.driver.switchTo().alert();
    await alert.accept();
  } catch (e) {}
  await this.driver.sleep(2000);
});

When('pengguna memilih Status Ring ke-2 dengan nilai {string}', async function (ringValue) {
  // Untuk card ke-2, cari semua input di bawah label "Status Ring", ambil yang ke-2
  const inputs = await this.driver.findElements(
    By.xpath("//label[contains(text(), 'Status Ring')]/following-sibling::div//input")
  );
  const input2 = inputs[1] || inputs[0];

  await this.driver.executeScript("arguments[0].scrollIntoView({block:'center'});", input2);
  await this.driver.sleep(300);
  await input2.click();
  await this.driver.sleep(800);

  await input2.sendKeys(ringValue);
  await this.driver.sleep(1500);
  await input2.sendKeys(Key.ENTER);
  await this.driver.sleep(800);
});

When('pengguna mengetik institusi ke-2 dengan nilai {string}', async function (institusiName) {
  const institusiInputs = await this.driver.findElements(By.css('input[placeholder*="Ketik untuk mencari"]'));
  const institusiInput2 = institusiInputs[1];
  await institusiInput2.clear();
  await this.setValueReact(institusiInput2, institusiName);
  await this.driver.sleep(1000);
});

When('pengguna menekan tombol "TAMBAH FORM" atau "TAMBAH RENCANA LAIN"', async function () {
  const addMoreBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'TAMBAH FORM') or contains(text(),'TAMBAH RENCANA LAIN') or contains(text(),'TAMBAH RENCANA')]")),
    15000
  );
  await this.driver.executeScript("arguments[0].scrollIntoView(true);", addMoreBtn);
  await this.driver.sleep(500);
  await addMoreBtn.click();
  await this.driver.sleep(1000);
});

When('pengguna mengklik tombol "HAPUS" pada kartu rencana kedua', async function () {
  const hapusBtns = await this.driver.findElements(By.xpath("//button[contains(text(),'HAPUS')]"));
  const hapusBtn2 = hapusBtns[0];
  await hapusBtn2.click();
  await this.driver.sleep(1000);
});

Then('kartu rencana kedua terhapus dari form', async function () {
  const hapusBtns = await this.driver.findElements(By.xpath("//button[contains(text(),'HAPUS')]"));
  expect(hapusBtns.length).to.equal(0);
});

When('pengguna mengklik salah satu sel tanggal di kalender', async function () {
  const dayCell = await this.driver.wait(
    until.elementLocated(By.xpath("//div[contains(@class, 'min-h-[100px]') and .//div[contains(@title, '—')]]")),
    20000,
    'Timeout: Tidak ada sel tanggal kalender yang memiliki rencana kunjungan'
  );
  await this.driver.executeScript("arguments[0].scrollIntoView({block:'center'});", dayCell);
  await this.driver.sleep(500);
  await dayCell.click();
  await this.driver.sleep(1500);
});

When('pengguna mengklik ikon edit "Pen" pada salah satu aktivitas', async function () {
  const editBtn = await this.driver.wait(
    until.elementLocated(By.css('button[title="Edit Kunjungan"]')),
    15000
  );
  await editBtn.click();
  await this.driver.sleep(2500);
});

When('pengguna mengubah data PIC Nama menjadi {string} di modal edit', async function (newPicName) {
  const picInput = await this.driver.wait(
    until.elementLocated(By.xpath("//label[contains(text(),'Nama PIC')]/following-sibling::input")),
    15000
  );
  await picInput.clear();
  await this.setValueReact(picInput, newPicName);
  await this.driver.sleep(1000);
});

When('pengguna mengklik tombol simpan perubahan "Update"', async function () {
  const updateBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'Update') or contains(text(),'SIMPAN PERUBAHAN')]")),
    15000
  );
  await updateBtn.click();

  try {
    await this.driver.wait(until.alertIsPresent(), 8000);
    const alert = await this.driver.switchTo().alert();
    await alert.accept();
  } catch (e) {}

  await this.driver.sleep(2000);
});

Then('perubahan data rencana kunjungan tersimpan', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.not.include('Riwayat Perubahan PIC');
});

Then('rencana kunjungan tersimpan dan sistem mengarahkan ke halaman {string}', async function (expectedPath) {
  await this.driver.wait(async () => {
    const currentUrl = await this.driver.getCurrentUrl();
    return currentUrl.includes(expectedPath);
  }, 25000, `Timeout: Gagal diarahkan ke ${expectedPath}`);

  const currentUrl = await this.driver.getCurrentUrl();
  expect(currentUrl).to.include(expectedPath);
});
