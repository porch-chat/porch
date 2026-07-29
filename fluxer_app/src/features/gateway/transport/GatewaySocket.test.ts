// SPDX-License-Identifier: AGPL-3.0-or-later

import {GatewaySocket} from '@app/features/gateway/transport/GatewaySocket';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('@app/features/app/state/GeoIP', () => ({default: {}}));
vi.mock('@app/features/auth/state/Authentication', () => ({
	default: {handleConnectionClosed: vi.fn()},
}));
vi.mock('@app/features/gateway/transport/GatewayConnection', () => ({
	default: {logout: vi.fn()},
}));
vi.mock('@app/features/gateway/transport/GatewayCompression', () => ({
	GatewayCompression: class {},
	isGatewayCompressionError: () => false,
}));
vi.mock('@app/features/gateway/transport/GatewayTimingsFormatter', () => ({
	formatGatewayReadyTimings: () => null,
}));
vi.mock('@app/features/platform/state/PersistentStorage', () => ({
	default: {clearExcept: vi.fn()},
	PRESERVED_RESET_STORAGE_KEYS: [],
}));
vi.mock('@app/features/platform/utils/AppLogger', () => ({
	LogLevel: {Debug: 'debug'},
	Logger: class {
		debug = vi.fn();
		info = vi.fn();
		warn = vi.fn();
		error = vi.fn();
		fatal = vi.fn();
		isLevelEnabled = () => false;
	},
}));
vi.mock('@app/features/platform/utils/RetryScheduler', () => ({
	ExponentialBackoff: class {
		next = () => 1000;
		reset = vi.fn();
		getCurrentAttempts = () => 0;
	},
}));
vi.mock('@app/features/ui/state/LayerManager', () => ({default: {closeAll: vi.fn()}}));
vi.mock('@app/features/ui/state/MobileLayout', () => ({default: {enabled: false}}));
vi.mock('@app/features/voice/engine/MediaEngineFacade', () => ({default: {}}));

class MockWebSocket extends EventTarget {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;

	readonly url: string;
	readyState = MockWebSocket.CONNECTING;
	binaryType: BinaryType = 'blob';
	readonly sent: Array<string | ArrayBufferLike | Blob | ArrayBufferView> = [];
	readonly closes: Array<{code?: number; reason?: string}> = [];

	constructor(url: string | URL) {
		super();
		this.url = String(url);
		createdSockets.push(this);
	}

	open(): void {
		this.readyState = MockWebSocket.OPEN;
		this.dispatchEvent(new Event('open'));
	}

	message(data: string): void {
		const event = new Event('message') as Event & {data: string};
		Object.defineProperty(event, 'data', {value: data});
		this.dispatchEvent(event);
	}

	send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
		this.sent.push(data);
	}

	close(code?: number, reason?: string): void {
		this.readyState = MockWebSocket.CLOSING;
		this.closes.push({code, reason});
	}
}

const createdSockets: Array<MockWebSocket> = [];

describe('GatewaySocket initial session watchdog', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		createdSockets.length = 0;
		vi.stubGlobal('window', globalThis);
		vi.stubGlobal('WebSocket', MockWebSocket);
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	test('reconnects when IDENTIFY never receives READY', async () => {
		const socket = new GatewaySocket('wss://api.porch.chat/gateway', {
			apiVersion: 1,
			token: 'test-token',
			properties: {
				os: 'test',
				browser: 'test',
				device: 'test',
				locale: 'en-US',
				user_agent: 'test',
				browser_version: '1',
				os_version: '1',
				build_version: 'test',
			},
			compression: 'none',
		});

		socket.connect();
		await Promise.resolve();
		await Promise.resolve();

		expect(createdSockets).toHaveLength(1);
		const webSocket = createdSockets[0];
		webSocket.open();
		webSocket.message(JSON.stringify({op: 10, d: {heartbeat_interval: 60000}}));
		await Promise.resolve();
		await Promise.resolve();

		expect(webSocket.sent).toHaveLength(1);
		expect(JSON.parse(String(webSocket.sent[0]))).toMatchObject({op: 2, d: {token: 'test-token'}});

		await vi.advanceTimersByTimeAsync(30000);

		expect(webSocket.closes).toContainEqual({code: 4000, reason: 'Gateway READY timeout'});
	});

	test('keeps a socket open after READY arrives', async () => {
		const socket = new GatewaySocket('wss://api.porch.chat/gateway', {
			apiVersion: 1,
			token: 'test-token',
			properties: {
				os: 'test',
				browser: 'test',
				device: 'test',
				locale: 'en-US',
				user_agent: 'test',
				browser_version: '1',
				os_version: '1',
				build_version: 'test',
			},
			compression: 'none',
		});

		socket.connect();
		await Promise.resolve();
		await Promise.resolve();

		const webSocket = createdSockets[0];
		webSocket.open();
		webSocket.message(JSON.stringify({op: 10, d: {heartbeat_interval: 60000}}));
		await Promise.resolve();
		await Promise.resolve();
		webSocket.message(JSON.stringify({op: 0, t: 'READY', d: {session_id: 'session-1'}}));

		await vi.advanceTimersByTimeAsync(30000);

		expect(webSocket.closes).toHaveLength(0);
	});
});
