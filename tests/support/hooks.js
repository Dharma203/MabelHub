const { Before, AfterAll } = require('@cucumber/cucumber');
const { closeGlobalBrowser } = require('./world');

Before(async function () {
  await this.openBrowser();
  
  // Navigasi ke domain target terlebih dahulu agar Chrome mengizinkan manipulasi cookie localhost
  await this.navigateTo('/');
  
  // Hapus semua cookies untuk domain localhost
  await this.driver.manage().deleteAllCookies();
  
  // Hapus local storage dan session storage
  try {
    await this.driver.executeScript('window.localStorage.clear(); window.sessionStorage.clear();');
  } catch (e) {
    // Abaikan jika ditolak
  }
  
  // Refresh/navigasi ulang ke / agar browser bersih sepenuhnya dari sesi aktif
  await this.navigateTo('/');
});

AfterAll(async function () {
  await closeGlobalBrowser();
});
