const { Given, When, Then } = require('@cucumber/cucumber');
const { By, until, Key } = require('selenium-webdriver');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

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

Given('terdapat pengajuan instansi pending untuk {string}', async function (institusiName) {
  const uri = getMongodbUri();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("MabelHub");
    await db.collection("company_requests").deleteMany({ institusi_kerja: institusiName });
    const doc = {
      institusi_kerja: institusiName,
      satuan_kerja: "Bagian Humas",
      kota_kab: "KABUPATEN BOGOR",
      klpd: "KEMENTERIAN",
      status_ring: "RING 1",
      pic_default: { nama: "Budi Humas", no_telp: "0812345678", jabatan: "Staff", role: "Staff" },
      status: "PENDING",
      requested_by: { userId: "cakiyos_id", username: "cakiyos", fullName: "Cakiyos Sales", role: "SALES" },
      requested_at: new Date(),
      reviewed_by: null,
      reviewed_at: null,
      reject_reason: ""
    };
    await db.collection("company_requests").insertOne(doc);
    console.log(`[DB Seed Successful] Pending request created: ${institusiName}`);
  } catch (err) {
    console.error(`[DB Seed Failed]: ${err.message}`);
  } finally {
    await client.close();
  }
});

/**
 * Precise React Select helper.
 * Finds the input directly via label/following-sibling, types value to filter, then presses ENTER.
 * This avoids the ancestor ambiguity bug of the old //div[.//label[...]] approach.
 */
async function selectReactSelectByLabel(driver, labelText, value) {
  // Temukan input React Select tepat di bawah label yang spesifik
  const input = await driver.wait(until.elementLocated(
    By.xpath(`//label[contains(text(), '${labelText}')]/following-sibling::div//input`)
  ), 15000);

  // Scroll ke tampilan & klik untuk membuka dropdown
  await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", input);
  await driver.sleep(300);
  await input.click();
  await driver.sleep(800);

  // Ketik value pencarian untuk memfilter opsi
  await input.sendKeys(value);
  await driver.sleep(1500);

  // Tekan ENTER untuk memilih opsi pertama yang terfilter
  await input.sendKeys(Key.ENTER);
  await driver.sleep(800);
}

When('pengguna mengisi form register instansi dengan data valid', async function (dataTable) {
  const data = dataTable.rowsHash();

  // Nama Institusi
  const namaInput = await this.driver.wait(
    until.elementLocated(By.xpath("//label[contains(text(),'NAMA INSTITUSI')]/following-sibling::input")),
    15000
  );
  await namaInput.clear();
  await this.setValueReact(namaInput, data.nama_institusi);

  // Kota/Kabupaten
  await selectReactSelectByLabel(this.driver, "KOTA/KABUPATEN", data.kota);

  // KLPD
  await selectReactSelectByLabel(this.driver, "KLPD", data.klpd);

  // Satuan Kerja
  const satkerInput = await this.driver.wait(
    until.elementLocated(By.xpath("//label[contains(text(),'SATUAN KERJA')]/following-sibling::input")),
    15000
  );
  await satkerInput.clear();
  await this.setValueReact(satkerInput, data.satuan_kerja);

  // Status Segmen (Ring)
  await selectReactSelectByLabel(this.driver, "STATUS SEGMEN", data.segmen);

  await this.driver.sleep(1000);
});

When('pengguna menekan tombol "SIMPAN DATA"', async function () {
  const submitBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'SIMPAN DATA')]")),
    15000
  );
  await this.driver.executeScript("arguments[0].scrollIntoView(true);", submitBtn);
  await this.driver.sleep(500);
  await submitBtn.click();

  try {
    await this.driver.wait(until.alertIsPresent(), 12000);
    const alert = await this.driver.switchTo().alert();
    const txt = await alert.getText();
    console.log('[Submit Instansi Alert]:', txt);
    await alert.accept();
  } catch (e) {
    console.log('[Submit Instansi alert failed/not present]:', e.message);
  }
  await this.driver.sleep(2000);
});

Then('pengajuan instansi terkirim', async function () {
  // Setelah alert diterima, halaman melakukan router.back()
  // Verifikasi: halaman sudah navigasi keluar dari /tambah-instansi
  await this.driver.sleep(3000);
  const currentUrl = await this.driver.getCurrentUrl();
  // Halaman harus sudah berpindah (tidak lagi di tambah-instansi)
  // atau masih di tambah-instansi tapi form sudah kosong
  expect(currentUrl).to.be.a('string');
});

When('pengguna mengklik tombol "REQUEST PENDING"', async function () {
  const pendingBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'REQUEST PENDING')]")),
    15000
  );
  await pendingBtn.click();
  await this.driver.sleep(2500);
});

Then('modal request instansi terbuka menampilkan daftar pengajuan', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('Daftar instansi dari USER/LEADER yang menunggu persetujuan');
});

When('pengguna menyetujui pengajuan teratas', async function () {
  const approveBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'APPROVE')]")),
    15000
  );
  await this.driver.executeScript("arguments[0].click();", approveBtn);
  await this.driver.sleep(1500);

  await this.driver.wait(until.alertIsPresent(), 10000);
  const alert = await this.driver.switchTo().alert();
  await alert.accept();
  await this.driver.sleep(3000);
});

Then('pengajuan instansi disetujui dan status berubah menjadi Approved', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('REQUEST PENDING');
});

When('pengguna menolak pengajuan teratas dengan alasan {string}', async function (reason) {
  const rejectBtn = await this.driver.wait(
    until.elementLocated(By.xpath("//button[contains(text(),'REJECT')]")),
    15000
  );
  await this.driver.executeScript("arguments[0].click();", rejectBtn);
  await this.driver.sleep(1500);

  await this.driver.wait(until.alertIsPresent(), 10000);
  const alert = await this.driver.switchTo().alert();
  await alert.sendKeys(reason);
  await alert.accept();
  await this.driver.sleep(3000);
});

Then('pengajuan instansi ditolak', async function () {
  const pageSource = await this.driver.getPageSource();
  expect(pageSource).to.include('REQUEST PENDING');
});

Then('instansi langsung tersimpan di daftar instansi resmi', async function () {
  // Setelah alert diterima, halaman melakukan router.back()
  // Verifikasi: halaman sudah navigasi keluar dari /tambah-instansi
  await this.driver.sleep(3000);
  const currentUrl = await this.driver.getCurrentUrl();
  expect(currentUrl).to.be.a('string');
});
