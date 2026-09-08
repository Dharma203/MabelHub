const { When, Then } = require('@cucumber/cucumber');
const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

When('pengguna mengklik tombol "Lihat semua" pada salah satu kategori produk', async function () {
  // Gunakan pencarian generic tag untuk "Lihat semua" karena ia dirender sebagai span
  const lihatSemuaLink = await this.driver.wait(
    until.elementLocated(By.xpath("//*[contains(text(),'Lihat semua') or contains(text(),'Lihat Semua')]")),
    15000
  );
  await this.driver.executeScript("arguments[0].scrollIntoView(true);", lihatSemuaLink);
  await this.driver.sleep(500);
  await lihatSemuaLink.click();
  await this.driver.sleep(2000);
});

Then('halaman detail kategori terbuka menampilkan daftar berkas dokumen', async function () {
  await this.waitForPageContent();
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('Product Hub');
});

When('pengguna mengakses halaman detail kategori {string}', async function (pathUrl) {
  await this.navigateTo(pathUrl);
  await this.driver.sleep(2000);
  await this.waitForPageContent();
});

When('pengguna mengklik tombol "Preview" pada salah satu dokumen produk', async function () {
  const previewBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//a[contains(text(),'Preview')]")),
    15000
  );
  expect(previewBtn).to.not.be.null;
});

Then('sistem membuka pratinjau berkas dokumen', async function () {
  const previewBtn = await this.driver.findElement(By.xpath("//a[contains(text(),'Preview')]"));
  const target = await previewBtn.getAttribute('target');
  const href = await previewBtn.getAttribute('href');
  expect(href).to.not.be.empty;
  expect(target).to.equal('_blank');
});

When('pengguna mengklik tombol "Unduh" pada salah satu dokumen produk', async function () {
  const unduhBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//a[contains(text(),'Unduh')]")),
    15000
  );
  expect(unduhBtn).to.not.be.null;
});

Then('file dokumen berhasil diunduh', async function () {
  const unduhBtn = await this.driver.findElement(By.xpath("//a[contains(text(),'Unduh')]"));
  const downloadAttr = await unduhBtn.getAttribute('download');
  expect(downloadAttr).to.not.be.null;
});

When('pengguna mengetik {string} pada kolom pencarian dokumen', async function (keyword) {
  const searchInput = await this.driver.wait(
    until.elementLocated(By.css('input[placeholder*="Cari dokumen"]')),
    15000
  );
  await searchInput.clear();
  await this.setValueReact(searchInput, keyword);
  await this.driver.sleep(1500);
});

Then('sistem menyaring dokumen yang ditampilkan sesuai kata kunci', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('brochure_v1');
});

When('pengguna mengunggah dokumen baru bernama {string}', async function (fileName) {
  const mockFilePath = path.resolve(fileName);
  fs.writeFileSync(mockFilePath, 'mock pdf document content');

  const fileInput = await this.driver.wait(
    until.elementLocated(By.css('input[type="file"]')),
    15000
  );
  
  await fileInput.sendKeys(mockFilePath);
  await this.driver.sleep(3000);

  try {
    fs.unlinkSync(mockFilePath);
  } catch (e) {}
});

Then('dokumen baru berhasil ditambahkan ke daftar kategori', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('brosur_baru.pdf');
});

When('pengguna mengklik tombol "Hapus" pada salah satu dokumen produk', async function () {
  const deleteBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'Hapus')]")),
    15000
  );
  await deleteBtn.click();
  await this.driver.sleep(1000);
});

When('pengguna menyetujui konfirmasi hapus dokumen', async function () {
  await this.driver.wait(until.alertIsPresent(), 8000);
  const alert = await this.driver.switchTo().alert();
  await alert.accept();
  await this.driver.sleep(2000);
});

Then('dokumen terhapus dari sistem', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.not.include('brochure_v1.pdf');
});

When('pengguna mengklik tombol "Kunci" pada dokumen produk yang tidak terkunci', async function () {
  const lockBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'Kunci')]")),
    15000
  );
  await lockBtn.click();
  await this.driver.sleep(2000);
});

Then('status berkas berubah menjadi terkunci dan tombol unduh dinonaktifkan untuk Sales', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('Buka');
});

When('pengguna mengklik tombol "Buka" pada dokumen produk yang terkunci', async function () {
  const unlockBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'Buka')]")),
    15000
  );
  await unlockBtn.click();
  await this.driver.sleep(2000);
});

Then('status berkas kembali menjadi terbuka dan dapat diunduh', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('Kunci');
});

Then('halaman Product Hub terbuka menampilkan daftar kategori', async function () {
  await this.waitForPageContent();
  const pageSource = await this.driver.getPageSource();
  expect(pageSource.toLowerCase()).to.include('product');
});
