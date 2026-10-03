import { Notice, Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	WallabagSyncSettings,
	WallabagSyncSettingTab,
} from './settings';
import { syncNotes } from './sync';
import { WallabagClient } from './client';

export default class WallabagSyncPlugin extends Plugin {
	settings!: WallabagSyncSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'sync-wallabag',
			name: 'Run now',
			callback: () => {
				void this.syncHighlights();
			},
		});

		this.addSettingTab(new WallabagSyncSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.syncOnStart) {
				void this.syncHighlights();
			}
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<WallabagSyncSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async syncHighlights(): Promise<void> {
		const progress = new Notice('Syncing wallabag…', 0);
		try {
			const result = await syncNotes(this);
			progress.hide();
			const count = result.count;
			new Notice(`wallabag sync: ${count} changes`);
		} catch (error) {
			progress.hide();
			new Notice(`wallabag: ${this.errorMessage(error)}`);
		}
	}

	async connectToWallabag() {
		try {
			const client = this.createClient();
			await client.authenticate();
			const user = await client.getUser();
			new Notice(`Connected to wallabag as ${user.username ?? 'unknown'}.`);
		} catch (error) {
			new Notice(`wallabag: ${this.errorMessage(error)}`);
		}
	}

	async testWallabag() {
		try {
			const version = await this.createClient().getVersion();
			new Notice(`wallabag ${version} is reachable.`);
		} catch (error) {
			new Notice(`wallabag: ${this.errorMessage(error)}`);
		}
	}

	createClient(): WallabagClient {
		return new WallabagClient(this.settings, () => this.saveSettings());
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
