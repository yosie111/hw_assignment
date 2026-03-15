// tests/unit/registerFlow.test.js
//
// Unit tests for ToolShop account registration via REST API.
//
// ★ Uses undici MockAgent to intercept native fetch (Node 18+).
//   No real HTTP calls — all responses are mocked.
//
// ★ Tests cover:
//   - Happy paths: 201 created, 422 already exists
//   - Error paths: 500 server error, 400 bad request, network error, timeout
//   - Input validation: missing email, password, apiUrl
//   - Error parsing: JSON and non-JSON responses
//   - Retry behavior: transient 500 → retry → success

// ── Mock withRetry to run fn immediately (1 attempt) unless test overrides ──
// This avoids real delays in tests while testing retry logic explicitly.

const MOCK_API_URL = 'https://api.practicesoftwaretesting.com';
const MOCK_EMAIL = 'gohok69228@dolofan.com';
const MOCK_PASSWORD = 'gohok69228@A';

// ── We need to mock fetch globally for these tests ──
let originalFetch;
let mockFetchImpl;

beforeEach(() => {
  originalFetch = global.fetch;
  // Default: successful registration
  mockFetchImpl = jest.fn().mockResolvedValue({
    status: 201,
    text: async () => JSON.stringify({ id: 1, email: MOCK_EMAIL }),
  });
  global.fetch = mockFetchImpl;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

// ── Import after setting up mocks ──
const { registerAccount, _internals } = require('../../src/automation/sites/toolshop/flows/registerFlow');
const { validateRegistrationInput, parseErrorResponse, DEFAULT_PROFILE } = _internals;

// ═══════════════════════════════════════════════════
// ★ validateRegistrationInput
// ═══════════════════════════════════════════════════

describe('validateRegistrationInput', () => {
  test('passes with valid inputs', () => {
    expect(() =>
      validateRegistrationInput({
        email: MOCK_EMAIL,
        password: MOCK_PASSWORD,
        apiUrl: MOCK_API_URL,
      })
    ).not.toThrow();
  });

  test('throws when apiUrl is missing', () => {
    expect(() =>
      validateRegistrationInput({ email: MOCK_EMAIL, password: MOCK_PASSWORD, apiUrl: '' })
    ).toThrow('apiUrl is required');
  });

  test('throws when apiUrl is not a string', () => {
    expect(() =>
      validateRegistrationInput({ email: MOCK_EMAIL, password: MOCK_PASSWORD, apiUrl: 123 })
    ).toThrow('apiUrl is required');
  });

  test('throws when email is missing', () => {
    expect(() =>
      validateRegistrationInput({ email: '', password: MOCK_PASSWORD, apiUrl: MOCK_API_URL })
    ).toThrow('email is required');
  });

  test('throws when password is missing', () => {
    expect(() =>
      validateRegistrationInput({ email: MOCK_EMAIL, password: '', apiUrl: MOCK_API_URL })
    ).toThrow('password is required');
  });

  test('throws when password is too short', () => {
    expect(() =>
      validateRegistrationInput({ email: MOCK_EMAIL, password: 'ab', apiUrl: MOCK_API_URL })
    ).toThrow('password too short');
  });
});

// ═══════════════════════════════════════════════════
// ★ parseErrorResponse
// ═══════════════════════════════════════════════════

describe('parseErrorResponse', () => {
  test('extracts message from JSON { message: "..." }', () => {
    const result = parseErrorResponse('{"message":"Email already taken"}');
    expect(result).toBe('Email already taken');
  });

  test('extracts error from JSON { error: "..." }', () => {
    const result = parseErrorResponse('{"error":"Server error"}');
    expect(result).toBe('Server error');
  });

  test('stringifies errors from JSON { errors: {...} }', () => {
    const result = parseErrorResponse('{"errors":{"email":["required"]}}');
    expect(result).toContain('email');
  });

  test('returns raw text for non-JSON response', () => {
    const result = parseErrorResponse('Internal Server Error');
    expect(result).toBe('Internal Server Error');
  });

  test('returns "Unknown error" for empty string', () => {
    const result = parseErrorResponse('');
    expect(result).toBe('Unknown error');
  });
});

// ═══════════════════════════════════════════════════
// ★ registerAccount — Happy Paths
// ═══════════════════════════════════════════════════

describe('registerAccount — happy paths', () => {
  // Suppress console output during tests
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('returns { success: true, alreadyExists: false } on 201', async () => {
    mockFetchImpl.mockResolvedValue({
      status: 201,
      text: async () => JSON.stringify({ id: 42, email: MOCK_EMAIL }),
    });

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(false);
    expect(result.statusCode).toBe(201);
  });

  test('returns { success: true, alreadyExists: false } on 200', async () => {
    mockFetchImpl.mockResolvedValue({
      status: 200,
      text: async () => '{"id": 1}',
    });

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(false);
    expect(result.statusCode).toBe(200);
  });

  test('returns { success: true, alreadyExists: true } on 422', async () => {
    mockFetchImpl.mockResolvedValue({
      status: 422,
      text: async () => '{"email":["already taken"]}',
    });

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(true);
    expect(result.statusCode).toBe(422);
  });

  test('sends correct body with DEFAULT_PROFILE + email + password', async () => {
    await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(mockFetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetchImpl.mock.calls[0];

    expect(url).toBe(`${MOCK_API_URL}/users/register`);
    expect(options.method).toBe('POST');

    const sentBody = JSON.parse(options.body);
    expect(sentBody.email).toBe(MOCK_EMAIL);
    expect(sentBody.password).toBe(MOCK_PASSWORD);
    expect(sentBody.first_name).toBe(DEFAULT_PROFILE.first_name);
    expect(sentBody.city).toBe(DEFAULT_PROFILE.city);
  });

  test('sends Content-Type and Accept headers', async () => {
    await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    const [, options] = mockFetchImpl.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['Accept']).toBe('application/json');
  });
});

// ═══════════════════════════════════════════════════
// ★ registerAccount — Error Paths
// ═══════════════════════════════════════════════════

describe('registerAccount — error paths', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('returns { success: false } on 400 (client error)', async () => {
    mockFetchImpl.mockResolvedValue({
      status: 400,
      text: async () => '{"message":"Bad request"}',
    });

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Bad request');
    expect(result.statusCode).toBe(400);
  });

  test('returns { success: false } on network error', async () => {
    mockFetchImpl.mockRejectedValue(new Error('fetch failed'));

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('fetch failed');
  });

  test('returns { success: false, error: "timeout" } on AbortError', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetchImpl.mockRejectedValue(abortError);

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('timeout');
  });

  test('returns { success: false, error: "timeout" } on TimeoutError', async () => {
    const timeoutError = new Error('The operation timed out');
    timeoutError.name = 'TimeoutError';
    mockFetchImpl.mockRejectedValue(timeoutError);

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('timeout');
  });

  test('never throws — always resolves (even on unexpected errors)', async () => {
    mockFetchImpl.mockRejectedValue(new TypeError('Unexpected'));

    // Should NOT throw
    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════
// ★ registerAccount — Input Validation
// ═══════════════════════════════════════════════════

describe('registerAccount — input validation', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('throws on missing apiUrl', async () => {
    await expect(
      registerAccount({ email: MOCK_EMAIL, password: MOCK_PASSWORD, apiUrl: '' })
    ).rejects.toThrow('apiUrl is required');
  });

  test('throws on missing email', async () => {
    await expect(
      registerAccount({ email: '', password: MOCK_PASSWORD, apiUrl: MOCK_API_URL })
    ).rejects.toThrow('email is required');
  });

  test('throws on missing password', async () => {
    await expect(
      registerAccount({ email: MOCK_EMAIL, password: '', apiUrl: MOCK_API_URL })
    ).rejects.toThrow('password is required');
  });

  test('does NOT call fetch when validation fails', async () => {
    try {
      await registerAccount({ email: '', password: MOCK_PASSWORD, apiUrl: MOCK_API_URL });
    } catch { /* expected */ }

    expect(mockFetchImpl).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════
// ★ registerAccount — Retry on 5xx
// ═══════════════════════════════════════════════════

describe('registerAccount — retry behavior on 5xx', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('retries on 500 and succeeds on second attempt', async () => {
    mockFetchImpl
      .mockResolvedValueOnce({
        status: 500,
        text: async () => '{"message":"Internal server error"}',
      })
      .mockResolvedValueOnce({
        status: 201,
        text: async () => '{"id": 1}',
      });

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    expect(result.success).toBe(true);
    expect(mockFetchImpl).toHaveBeenCalledTimes(2);
  });

  test('fails after max retry attempts on persistent 500', async () => {
    mockFetchImpl.mockResolvedValue({
      status: 500,
      text: async () => '{"message":"DB down"}',
    });

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    // withRetry with maxAttempts: 2 → 2 calls
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed after');
    expect(mockFetchImpl).toHaveBeenCalledTimes(2);
  });

  test('does NOT retry on 400 (client error)', async () => {
    mockFetchImpl.mockResolvedValue({
      status: 400,
      text: async () => '{"message":"Invalid email format"}',
    });

    const result = await registerAccount({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      apiUrl: MOCK_API_URL,
    });

    // 400 is a client error — no retry, returns immediately
    expect(result.success).toBe(false);
    expect(mockFetchImpl).toHaveBeenCalledTimes(1);
  });
});
