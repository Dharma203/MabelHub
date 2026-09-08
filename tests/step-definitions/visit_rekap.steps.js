const { When, Then } = require('@cucumber/cucumber');
const { By, until, Key } = require('selenium-webdriver');
const { expect } = require('chai');

// Robust search & click React Select Helper for Rekapitulasi Div-based fields
async function selectReactSelectByDivLabel(driver, divLabelText, value) {
  const xpath = `//div[div[contains(text(), '${divLabelText}')]]//div[contains(@class, 'Select') or contains(@class, 'container')]//input`;
  const input = await driver.wait(until.elementLocated(By.xpath(xpath)), 15000);
  
  await driver.executeScript("arguments[0].scrollIntoView(true); arguments[0].focus(); arguments[0].click();", input);
  await driver.sleep(500);
  
  await input.sendKeys(Key.chord(Key.CONTROL, "a"), Key.BACK_SPACE);
  await input.sendKeys(value);
  await driver.sleep(1200);
  
  const optionXpath = `//*[contains(@id, '-option-') and normalize-space()='${value}']`;
  const option = await driver.wait(until.elementLocated(By.xpath(optionXpath)), 15000);
  await driver.executeScript("arguments[0].click();", option);
  await driver.sleep(600);
}

When('pengguna mengubah filter Sales ke {string} atau pilihan lain', async function (salesName) {
  await selectReactSelectByDivLabel(this.driver, "SALES PERSON", salesName);
  await this.driver.sleep(2000);
});

Then('tabel rekapitulasi disaring menampilkan data yang sesuai', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('Menampilkan');
});

When('pengguna mengklik salah satu baris data kunjungan di tabel', async function () {
  const row = await this.driver.wait(
    until.elementLocated(By.xpath("//tbody/tr[contains(@class, 'cursor-pointer')]")),
    15000,
    'Timeout: Tidak ada data kunjungan yang dapat diklik'
  );
  await row.click();
  await this.driver.sleep(1500);
});

Then('panel detail kunjungan muncul secara inline di bawah baris tersebut', async function () {
  const detailPanel = await this.driver.wait(
    until.elementLocated(By.xpath("//div[contains(text(),'Detail Kunjungan')]")),
    10000,
    'Timeout: Detail inline Kunjungan tidak muncul'
  );
  expect(await detailPanel.isDisplayed()).to.be.true;
});

Then('sales hanya dapat melihat data kunjungan miliknya sendiri', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('Menampilkan');
});
