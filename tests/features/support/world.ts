import { World, setWorldConstructor } from '@cucumber/cucumber';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class CustomWorld extends World {
  public api: AxiosInstance;
  public response!: AxiosResponse;
  public requestBody: Record<string, unknown> = {};
  public requestHeaders: Record<string, string> = {};
  public authToken: string = '';
  public sessionCookie: string = '';

  // Storage for created resource IDs (cleanup & cross-step references)
  public createdUserId: string = '';
  public createdTeamId: string = '';
  public createdRequestId: string = '';

  constructor(options: any) {
    super(options);
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    this.api = axios.create({
      baseURL,
      validateStatus: () => true, // Don't throw on non-2xx status
    });
  }

  /**
   * Login via API and store the session cookie for subsequent requests.
   */
  async login(identity: string, password: string): Promise<AxiosResponse> {
    const res = await this.api.post(
      '/api/auth/login',
      { identity, password },
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Extract session cookie from Set-Cookie header
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const sessionMatch = setCookie
        .join('; ')
        .match(/session=([^;]+)/);
      if (sessionMatch) {
        this.sessionCookie = `session=${sessionMatch[1]}`;
        this.requestHeaders['Cookie'] = this.sessionCookie;
      }
    }

    return res;
  }

  /**
   * Set session cookie for authenticated requests.
   */
  setSessionCookie(cookie: string) {
    this.sessionCookie = cookie;
    this.requestHeaders['Cookie'] = cookie;
  }

  /**
   * Make an authenticated GET request.
   */
  async get(endpoint: string): Promise<AxiosResponse> {
    this.response = await this.api.get(endpoint, {
      headers: this.requestHeaders,
    });
    return this.response;
  }

  /**
   * Make an authenticated POST request.
   */
  async post(endpoint: string, body?: any): Promise<AxiosResponse> {
    this.response = await this.api.post(endpoint, body || this.requestBody, {
      headers: { 'Content-Type': 'application/json', ...this.requestHeaders },
    });
    return this.response;
  }

  /**
   * Make an authenticated PUT request.
   */
  async put(endpoint: string, body?: any): Promise<AxiosResponse> {
    this.response = await this.api.put(endpoint, body || this.requestBody, {
      headers: { 'Content-Type': 'application/json', ...this.requestHeaders },
    });
    return this.response;
  }

  /**
   * Make an authenticated PATCH request.
   */
  async patch(endpoint: string, body?: any): Promise<AxiosResponse> {
    this.response = await this.api.patch(endpoint, body || this.requestBody, {
      headers: { 'Content-Type': 'application/json', ...this.requestHeaders },
    });
    return this.response;
  }

  /**
   * Make an authenticated DELETE request.
   */
  async delete(endpoint: string, body?: any): Promise<AxiosResponse> {
    this.response = await this.api.delete(endpoint, {
      headers: { 'Content-Type': 'application/json', ...this.requestHeaders },
      data: body,
    });
    return this.response;
  }
}

setWorldConstructor(CustomWorld);
