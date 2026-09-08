const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

setDefaultTimeout(45000);

let globalDriver = null;

class CustomWorld {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  get driver() {
    return globalDriver;
  }

  async openBrowser() {
    if (globalDriver) {
      try {
        // Cek apakah sesi driver masih hidup
        await globalDriver.getCurrentUrl();
        return globalDriver;
      } catch (e) {
        console.log('[World] Sesi browser mati/tidak valid, membuat ulang driver...', e.message);
        try {
          await globalDriver.quit();
        } catch (err) {}
        globalDriver = null;
      }
    }

    const options = new chrome.Options();
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');

    globalDriver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await globalDriver.manage().setTimeouts({ pageLoad: 20000 });
    return globalDriver;
  }

  async closeBrowser() {
    // Penutupan dilakukan di AfterAll
  }

  async navigateTo(path) {
    await this.driver.get(`${this.baseUrl}${path}`);
  }

  async waitForPageContent(timeoutMs = 15000) {
    await this.driver.wait(async () => {
      const source = await this.driver.getPageSource();
      return source.length > 500 && !source.includes('<body></body>');
    }, timeoutMs, 'Timeout: Halaman masih kosong');
  }

  async setValueReact(element, value) {
    await this.driver.executeScript(`
      const input = arguments[0];
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      ).set;
      nativeInputValueSetter.call(input, arguments[1]);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    `, element, value);
  }
}

async function closeGlobalBrowser() {
  if (globalDriver) {
    try {
      await globalDriver.quit();
    } catch (e) {}
    globalDriver = null;
  }
}

setWorldConstructor(CustomWorld);
module.exports = {
  closeGlobalBrowser
};
