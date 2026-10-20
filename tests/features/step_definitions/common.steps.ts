import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';
import assert from 'assert';

// ==========================================
// GIVEN — Setup & Preconditions
// ==========================================

Given('user sudah login sebagai {string} dengan password {string}', async function (
  this: CustomWorld,
  identity: string,
  password: string
) {
  const res = await this.login(identity, password);
  assert.strictEqual(res.status, 200, `Login gagal untuk ${identity}: ${JSON.stringify(res.data)}`);
});

Given('user sudah login sebagai superadmin', async function (this: CustomWorld) {
  const identity = process.env.TEST_SUPERADMIN_EMAIL || 'superadmin';
  const password = process.env.TEST_SUPERADMIN_PASSWORD || 'superadmin123';
  const res = await this.login(identity, password);
  assert.strictEqual(res.status, 200, `Login superadmin gagal: ${JSON.stringify(res.data)}`);
});

Given('user sudah login sebagai admin', async function (this: CustomWorld) {
  const identity = process.env.TEST_ADMIN_EMAIL || 'admin';
  const password = process.env.TEST_ADMIN_PASSWORD || 'admin123';
  const res = await this.login(identity, password);
  assert.strictEqual(res.status, 200, `Login admin gagal: ${JSON.stringify(res.data)}`);
});

Given('user sudah login sebagai sales', async function (this: CustomWorld) {
  const identity = process.env.TEST_SALES_EMAIL || 'sales';
  const password = process.env.TEST_SALES_PASSWORD || 'sales123';
  const res = await this.login(identity, password);
  assert.strictEqual(res.status, 200, `Login sales gagal: ${JSON.stringify(res.data)}`);
});

Given('user sudah login sebagai leader', async function (this: CustomWorld) {
  const identity = process.env.TEST_LEADER_EMAIL || 'leader';
  const password = process.env.TEST_LEADER_PASSWORD || 'leader123';
  const res = await this.login(identity, password);
  assert.strictEqual(res.status, 200, `Login leader gagal: ${JSON.stringify(res.data)}`);
});

Given('user tidak login', function (this: CustomWorld) {
  this.requestHeaders = {};
  this.sessionCookie = '';
});

Given('user mengirim request body:', function (this: CustomWorld, docString: string) {
  this.requestBody = JSON.parse(docString);
});

// ==========================================
// WHEN — HTTP Actions
// ==========================================

When('user mengirim GET request ke {string}', async function (this: CustomWorld, endpoint: string) {
  await this.get(endpoint);
});

When('user mengirim POST request ke {string}', async function (this: CustomWorld, endpoint: string) {
  await this.post(endpoint);
});

When('user mengirim POST request ke {string} dengan body:', async function (
  this: CustomWorld,
  endpoint: string,
  docString: string
) {
  const body = JSON.parse(docString);
  await this.post(endpoint, body);
});

When('user mengirim PUT request ke {string}', async function (this: CustomWorld, endpoint: string) {
  await this.put(endpoint);
});

When('user mengirim PUT request ke {string} dengan body:', async function (
  this: CustomWorld,
  endpoint: string,
  docString: string
) {
  const body = JSON.parse(docString);
  await this.put(endpoint, body);
});

When('user mengirim PATCH request ke {string}', async function (this: CustomWorld, endpoint: string) {
  await this.patch(endpoint);
});

When('user mengirim DELETE request ke {string}', async function (this: CustomWorld, endpoint: string) {
  await this.delete(endpoint);
});

When('user mengirim DELETE request ke {string} dengan body:', async function (
  this: CustomWorld,
  endpoint: string,
  docString: string
) {
  const body = JSON.parse(docString);
  await this.delete(endpoint, body);
});

// ==========================================
// THEN — Assertions
// ==========================================

Then('response status code harus {int}', function (this: CustomWorld, statusCode: number) {
  assert.strictEqual(
    this.response.status,
    statusCode,
    `Expected status ${statusCode} but got ${this.response.status}. Body: ${JSON.stringify(this.response.data)}`
  );
});

Then('response harus mengandung field {string}', function (this: CustomWorld, field: string) {
  const keys = field.split('.');
  let value: any = this.response.data;
  for (const key of keys) {
    assert.ok(
      value !== null && value !== undefined && typeof value === 'object' && key in value,
      `Response does not contain field "${field}". Current value: ${JSON.stringify(value)}`
    );
    value = value[key];
  }
});

Then('response field {string} harus bernilai {string}', function (
  this: CustomWorld,
  field: string,
  expectedValue: string
) {
  const keys = field.split('.');
  let value: any = this.response.data;
  for (const key of keys) {
    value = value?.[key];
  }
  assert.strictEqual(
    String(value),
    expectedValue,
    `Expected "${field}" to be "${expectedValue}" but got "${value}"`
  );
});

Then('response field {string} harus bernilai boolean {string}', function (
  this: CustomWorld,
  field: string,
  expectedValue: string
) {
  const keys = field.split('.');
  let value: any = this.response.data;
  for (const key of keys) {
    value = value?.[key];
  }
  const expected = expectedValue === 'true';
  assert.strictEqual(
    value,
    expected,
    `Expected "${field}" to be ${expected} but got ${value}`
  );
});

Then('response harus berupa array', function (this: CustomWorld) {
  const data = this.response.data?.data ?? this.response.data;
  assert.ok(
    Array.isArray(data),
    `Expected response to be an array but got: ${typeof data}`
  );
});

Then('response array {string} harus memiliki minimal {int} item', function (
  this: CustomWorld,
  field: string,
  minCount: number
) {
  const keys = field.split('.');
  let data: any = this.response.data;
  for (const key of keys) {
    data = data?.[key];
  }
  assert.ok(
    Array.isArray(data) && data.length >= minCount,
    `Expected at least ${minCount} items in "${field}" but got ${Array.isArray(data) ? data.length : 'non-array'}`
  );
});

Then('response harus mengandung pesan error', function (this: CustomWorld) {
  const hasError = this.response.data?.error || this.response.data?.message;
  assert.ok(hasError, `Expected error message in response but got: ${JSON.stringify(this.response.data)}`);
});

Then('response harus mengandung pesan {string}', function (this: CustomWorld, message: string) {
  const responseData = JSON.stringify(this.response.data);
  assert.ok(
    responseData.includes(message),
    `Expected response to contain "${message}" but got: ${responseData}`
  );
});

Then('response field {string} tidak boleh kosong', function (this: CustomWorld, field: string) {
  const keys = field.split('.');
  let value: any = this.response.data;
  for (const key of keys) {
    value = value?.[key];
  }
  assert.ok(
    value !== null && value !== undefined && value !== '',
    `Expected "${field}" to not be empty but got: ${value}`
  );
});

Then('user menyimpan {string} dari response sebagai {string}', function (
  this: CustomWorld,
  field: string,
  storageKey: string
) {
  const keys = field.split('.');
  let value: any = this.response.data;
  for (const key of keys) {
    value = value?.[key];
  }
  if (storageKey === 'createdUserId') {
    this.createdUserId = String(value);
  } else if (storageKey === 'createdTeamId') {
    this.createdTeamId = String(value);
  } else if (storageKey === 'createdRequestId') {
    this.createdRequestId = String(value);
  }
});

Then('response status code harus salah satu dari {string}', function (
  this: CustomWorld,
  statusCodes: string
) {
  const codes = statusCodes.split(',').map((s) => parseInt(s.trim(), 10));
  assert.ok(
    codes.includes(this.response.status),
    `Expected status one of [${codes}] but got ${this.response.status}. Body: ${JSON.stringify(this.response.data)}`
  );
});
