import { requestUrl, RequestUrlResponse } from 'obsidian';
import type { WallabagSyncSettings } from './settings';

export interface WallabagUser {
	id: number;
	username: string;
	email: string;
}

export interface WallabagTag {
	id?: number;
	label: string;
	slug?: string;
}

export interface WallabagAnnotation {
	id: number;
	quote: string;
	text: string;
	created_at?: string;
	updated_at?: string;
}

export interface WallabagEntry {
	id: number;
	title: string;
	url: string;
	published_by?: string[];
	created_at?: string;
	published_at?: string;
	tags?: WallabagTag[];
	annotations: WallabagAnnotation[];
}

interface EntriesResponse {
	page?: number;
	pages?: number;
	_embedded?: { items?: WallabagEntry[] };
}

interface WallabagTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

interface TokenResponse {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	token_type: string;
}

export class WallabagError extends Error {}

export class WallabagClient {
	constructor(
		private readonly settings: WallabagSyncSettings,
		private readonly save: () => Promise<void>,
	) {}

	private get baseUrl(): string {
		const url = this.settings.wallabagUrl.trim().replace(/\/+$/, '');
		if (!url) {
			throw new WallabagError('Set the wallabag server URL first.');
		}
		return url;
	}

	async authenticate(): Promise<void> {
		if (!this.settings.clientId.trim()) {
			throw new WallabagError('Set the client ID first.');
		}
		if (!this.settings.username.trim()) {
			throw new WallabagError('Set the username first.');
		}
		if (!this.settings.clientSecret) {
			throw new WallabagError('Set the client secret first.');
		}
		if (!this.settings.password) {
			throw new WallabagError('Set the password first.');
		}

		const tokens = await this.requestTokens({
			grant_type: 'password',
			client_id: this.settings.clientId.trim(),
			client_secret: this.settings.clientSecret,
			username: this.settings.username.trim(),
			password: this.settings.password,
		});
		await this.storeTokens(tokens);
	}

	async getVersion(): Promise<string> {
		const response = await this.get('/api/version.json', false);
		const text = response.text.trim();
		try {
			const parsed: unknown = JSON.parse(text);
			return typeof parsed === 'string' ? parsed : text;
		} catch {
			return text;
		}
	}

	async getUser(): Promise<WallabagUser> {
		const response = await this.get('/api/user.json');
		return response.json as WallabagUser;
	}

	async getEntriesWithAnnotations(): Promise<WallabagEntry[]> {
		const entries: WallabagEntry[] = [];
		let page = 1;
		let pages = 1;
		do {
			const response = await this.get(
				`/api/entries.json?annotations=1&detail=full&perPage=30&page=${page}`,
			);
			const data = response.json as EntriesResponse;
			for (const item of data._embedded?.items ?? []) {
				entries.push(item);
			}
			pages = data.pages ?? 1;
			page = (data.page ?? page) + 1;
		} while (page <= pages);
		return entries.filter((entry) => (entry.annotations.length ?? 0) > 0);
	}

	private async requestTokens(
		body: Record<string, string>,
	): Promise<WallabagTokens> {
		const response = await requestUrl({
			url: `${this.baseUrl}/oauth/v2/token`,
			method: 'POST',
			contentType: 'application/x-www-form-urlencoded',
			body: new URLSearchParams(body).toString(),
			throw: false,
		});

		if (response.status < 200 || response.status >= 300) {
			throw new WallabagError(
				this.describeError(response, 'Could not authenticate with wallabag.'),
			);
		}

		const token = response.json as TokenResponse;
		return {
			accessToken: token.access_token,
			refreshToken: token.refresh_token ?? '',
			expiresAt: Date.now() + token.expires_in * 1000,
		};
	}

	private async storeTokens(tokens: WallabagTokens): Promise<void> {
		this.settings.accessToken = tokens.accessToken;
		this.settings.refreshToken = tokens.refreshToken;
		this.settings.tokenExpiresAt = tokens.expiresAt;
		await this.save();
	}

	private async getAccessToken(): Promise<string> {
		const accessToken = this.settings.accessToken;
		if (accessToken && Date.now() < this.settings.tokenExpiresAt - 60_000) {
			return accessToken;
		}
		return this.refreshAccessToken();
	}

	private async refreshAccessToken(): Promise<string> {
		const refreshToken = this.settings.refreshToken;
		if (!refreshToken) {
			throw new WallabagError('Not connected to wallabag. Connect first.');
		}
		if (!this.settings.clientId.trim()) {
			throw new WallabagError('Set the client ID first.');
		}
		if (!this.settings.clientSecret) {
			throw new WallabagError('Set the client secret first.');
		}

		const tokens = await this.requestTokens({
			grant_type: 'refresh_token',
			client_id: this.settings.clientId.trim(),
			client_secret: this.settings.clientSecret,
			refresh_token: refreshToken,
		});
		await this.storeTokens(tokens);
		return tokens.accessToken;
	}

	private async get(
		path: string,
		authenticated = true,
	): Promise<RequestUrlResponse> {
		const headers: Record<string, string> = {};
		if (authenticated) {
			headers.Authorization = `Bearer ${await this.getAccessToken()}`;
		}

		const response = await requestUrl({
			url: `${this.baseUrl}${path}`,
			method: 'GET',
			headers,
			throw: false,
		});

		if (response.status === 401) {
			throw new WallabagError('wallabag rejected the access token. Connect again.');
		}
		if (response.status < 200 || response.status >= 300) {
			throw new WallabagError(
				this.describeError(response, `Request to ${path} failed.`),
			);
		}
		return response;
	}

	private describeError(response: RequestUrlResponse, fallback: string): string {
		try {
			const data = response.json as {
				error_description?: string;
				error?: string;
			} | null;
			return (
				data?.error_description ??
				data?.error ??
				`${fallback} (HTTP ${response.status})`
			);
		} catch {
			return `${fallback} (HTTP ${response.status})`;
		}
	}
}
