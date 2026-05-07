import { describe, expect, it, vi } from 'vitest';
import { rotateResendKey } from '@/lib/resendKeyRotation';

/**
 * Builds a mock fetch that replies with the next response in a queue,
 * keyed by URL+method. Unmatched requests throw to surface unexpected
 * traffic in the test output.
 */
function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
		...init,
	});
}

interface MockCall {
	method: string;
	url: string;
	matcher: (url: string, init?: RequestInit) => boolean;
	response: Response | (() => Response);
}

function createFetchMock(calls: MockCall[]) {
	const log: Array<{ url: string; init?: RequestInit }> = [];
	const fetchFn: typeof fetch = (async (input: unknown, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : (input as { url: string }).url ?? String(input);
		log.push({ url, init });
		const idx = calls.findIndex((c) => c.matcher(url, init));
		if (idx === -1) {
			throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
		}
		const c = calls.splice(idx, 1)[0];
		return typeof c.response === 'function' ? c.response() : c.response;
	}) as unknown as typeof fetch;
	return { fetchFn, log, remaining: calls };
}

describe('rotateResendKey', () => {
	it('happy path: list → create → probe → delete', async () => {
		const { fetchFn, log } = createFetchMock([
			{
				method: 'GET',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && (i?.method ?? 'GET') === 'GET',
				response: jsonResponse({
					data: [
						{ id: 'key_old', name: 'fabrick', created_at: '2024-01-01T00:00:00Z' },
						{ id: 'key_older', name: 'old', created_at: '2023-01-01T00:00:00Z' },
					],
				}),
			},
			{
				method: 'POST',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && i?.method === 'POST',
				response: jsonResponse({ id: 'key_new', token: 're_new_token' }),
			},
			{
				method: 'GET',
				url: '/domains',
				matcher: (u) => u.endsWith('/domains'),
				response: jsonResponse({ data: [] }),
			},
			{
				method: 'DELETE',
				url: '/api-keys/key_old',
				matcher: (u, i) => u.endsWith('/api-keys/key_old') && i?.method === 'DELETE',
				response: jsonResponse({ id: 'key_old', deleted: true }),
			},
		]);

		const result = await rotateResendKey({ currentKey: 're_current', fetchFn });
		expect(result.success).toBe(true);
		if (!result.success) throw new Error('expected success');
		expect(result.newKey).toBe('re_new_token');
		expect(result.newKeyId).toBe('key_new');
		expect(result.oldKeyId).toBe('key_old');
		expect(result.deleteWarning).toBeNull();
		expect(log).toHaveLength(4);

		// Probe must use the NEW key, not the old one.
		const probeCall = log[2];
		expect((probeCall.init?.headers as Record<string, string>).Authorization).toBe('Bearer re_new_token');

		// Create body is JSON with name + permission=full_access by default.
		const createBody = JSON.parse(String(log[1].init?.body));
		expect(createBody.permission).toBe('full_access');
		expect(typeof createBody.name).toBe('string');
		expect(createBody.name).toMatch(/^fabrick-rotated-/);
	});

	it('probe failure: does NOT call DELETE and surfaces stage=probe', async () => {
		let deleteCalled = false;
		const { fetchFn } = createFetchMock([
			{
				method: 'GET',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && (i?.method ?? 'GET') === 'GET',
				response: jsonResponse({ data: [{ id: 'key_old', created_at: '2024-01-01T00:00:00Z' }] }),
			},
			{
				method: 'POST',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && i?.method === 'POST',
				response: jsonResponse({ id: 'key_new', token: 're_new_token' }),
			},
			{
				method: 'GET',
				url: '/domains',
				matcher: (u) => u.endsWith('/domains'),
				response: jsonResponse({ message: 'invalid_api_key' }, { status: 401 }),
			},
			{
				method: 'DELETE',
				url: '/api-keys/key_old',
				matcher: (u, i) => u.endsWith('/api-keys/key_old') && i?.method === 'DELETE',
				response: () => {
					deleteCalled = true;
					return jsonResponse({});
				},
			},
		]);

		const result = await rotateResendKey({ currentKey: 're_current', fetchFn });
		expect(result.success).toBe(false);
		if (result.success) throw new Error('expected failure');
		expect(result.stage).toBe('probe');
		expect(result.error).toMatch(/invalid_api_key/);
		expect(result.newKeyId).toBe('key_new');
		expect(deleteCalled).toBe(false);
	});

	it('delete failure: returns success with deleteWarning populated', async () => {
		const { fetchFn } = createFetchMock([
			{
				method: 'GET',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && (i?.method ?? 'GET') === 'GET',
				response: jsonResponse({ data: [{ id: 'key_old', created_at: '2024-01-01T00:00:00Z' }] }),
			},
			{
				method: 'POST',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && i?.method === 'POST',
				response: jsonResponse({ id: 'key_new', token: 're_new' }),
			},
			{
				method: 'GET',
				url: '/domains',
				matcher: (u) => u.endsWith('/domains'),
				response: jsonResponse({ data: [] }),
			},
			{
				method: 'DELETE',
				url: '/api-keys/key_old',
				matcher: (u, i) => u.endsWith('/api-keys/key_old') && i?.method === 'DELETE',
				response: jsonResponse({ message: 'cannot delete in-use key' }, { status: 422 }),
			},
		]);

		const result = await rotateResendKey({ currentKey: 're_current', fetchFn });
		expect(result.success).toBe(true);
		if (!result.success) throw new Error('expected success');
		expect(result.newKey).toBe('re_new');
		expect(result.deleteWarning).toMatch(/cannot delete/);
	});

	it('401 on create: bails after list with stage=create and a clear error', async () => {
		let probeCalled = false;
		const { fetchFn } = createFetchMock([
			{
				method: 'GET',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && (i?.method ?? 'GET') === 'GET',
				response: jsonResponse({ data: [] }),
			},
			{
				method: 'POST',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && i?.method === 'POST',
				response: jsonResponse({ message: 'API key is invalid' }, { status: 401 }),
			},
			{
				method: 'GET',
				url: '/domains',
				matcher: (u) => u.endsWith('/domains'),
				response: () => {
					probeCalled = true;
					return jsonResponse({});
				},
			},
		]);

		const result = await rotateResendKey({ currentKey: 're_current', fetchFn });
		expect(result.success).toBe(false);
		if (result.success) throw new Error('expected failure');
		expect(result.stage).toBe('create');
		expect(result.error).toMatch(/API key is invalid/);
		expect(probeCalled).toBe(false);
	});

	it('401 on list: bails immediately with stage=list', async () => {
		const { fetchFn } = createFetchMock([
			{
				method: 'GET',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && (i?.method ?? 'GET') === 'GET',
				response: jsonResponse({ message: 'unauthorized' }, { status: 401 }),
			},
		]);

		const result = await rotateResendKey({ currentKey: 're_bad', fetchFn });
		expect(result.success).toBe(false);
		if (result.success) throw new Error('expected failure');
		expect(result.stage).toBe('list');
	});

	it('honours custom newKeyName + permission', async () => {
		const { fetchFn, log } = createFetchMock([
			{
				method: 'GET',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && (i?.method ?? 'GET') === 'GET',
				response: jsonResponse({ data: [] }),
			},
			{
				method: 'POST',
				url: '/api-keys',
				matcher: (u, i) => u.endsWith('/api-keys') && i?.method === 'POST',
				response: jsonResponse({ id: 'k1', token: 're_token' }),
			},
			{
				method: 'GET',
				url: '/domains',
				matcher: (u) => u.endsWith('/domains'),
				response: jsonResponse({ data: [] }),
			},
		]);

		const result = await rotateResendKey({
			currentKey: 're_current',
			newKeyName: 'my-key',
			permission: 'sending_access',
			fetchFn,
		});
		expect(result.success).toBe(true);
		const createBody = JSON.parse(String(log[1].init?.body));
		expect(createBody).toEqual({ name: 'my-key', permission: 'sending_access' });
	});
});
