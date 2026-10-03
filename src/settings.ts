import { App, PluginSettingTab, SettingGroup } from 'obsidian';
import WallabagSyncPlugin from './main';

export interface WallabagSyncSettings {
	wallabagUrl: string;
	username: string;
	clientId: string;
	password: string;
	clientSecret: string;
	accessToken: string;
	refreshToken: string;
	tokenExpiresAt: number;
	notesFolder: string;
	syncOnStart: boolean;
	noteTemplate: string;
}

export const DEFAULT_SETTINGS: WallabagSyncSettings = {
	wallabagUrl: 'https://app.wallabag.it',
	username: '',
	clientId: '',
	password: '',
	clientSecret: '',
	accessToken: '',
	refreshToken: '',
	tokenExpiresAt: 0,
	notesFolder: 'Wallabag',
	syncOnStart: false,
	noteTemplate: `> {{text}} {{blockId}}
{{#note}}

{{note}}
{{/note}}`,
};

export class WallabagSyncSettingTab extends PluginSettingTab {
	plugin: WallabagSyncPlugin;

	constructor(app: App, plugin: WallabagSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.addAccountSettings(containerEl);
		this.addSyncSettings(containerEl);
		this.addNotesSettings(containerEl);
	}

	private addSyncSettings(containerEl: HTMLElement) {
		const group = new SettingGroup(containerEl).setHeading("Sync");
		group.addSetting((setting) => {
			setting
				.setName("Sync on start")
				.setDesc("If notes should be sync when opening Obsidian or activating the plugin")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.syncOnStart)
						.onChange(async (value) => {
							this.plugin.settings.syncOnStart = value;
							await this.plugin.saveSettings();
						}));
		});
	}

	private addNotesSettings(containerEl: HTMLElement) {
		const group = new SettingGroup(containerEl).setHeading("Notes");
		group.addSetting((setting) => {
			setting
				.setName("Note template")
				.addTextArea((text) => {
					text.inputEl.rows = 10;
					text
						.setPlaceholder("Enter a note template")
						.setValue(this.plugin.settings.noteTemplate)
						.onChange(async (value) => {
							this.plugin.settings.noteTemplate = value;
							await this.plugin.saveSettings();
						})
				})
		});
		group.addSetting((setting) => {
			setting
				.setName("Notes folder")
				.setDesc("The vault folder where synced notes go (created if it does not exists)")
				.addText((text) => {
					text.setValue(this.plugin.settings.notesFolder);
					text.onChange(async (value) => {
						this.plugin.settings.notesFolder = value.trim();
						await this.plugin.saveSettings();
					})
				})
		})
	}

	private addAccountSettings(containerEl: HTMLElement) {
		const group = new SettingGroup(containerEl).setHeading("Account");
		group.addSetting((setting) => {
			setting
				.setName("Wallabag instance URL")
				.addText((text) => {
					text
						.setValue(this.plugin.settings.wallabagUrl)
						.onChange(async (value) => {
							this.plugin.settings.wallabagUrl = value.trim();
							await this.plugin.saveSettings();
						})
				})
		});
		group.addSetting((setting) => {
			setting
				.setName("Username")
				.addText((text) => {
					text
						.setValue(this.plugin.settings.username)
						.onChange(async (value) => {
							this.plugin.settings.username = value.trim();
							await this.plugin.saveSettings();
						})
				})
		});
		group.addSetting((setting) => {
			setting
				.setName("Password")
				.addText((text) => {
					text.inputEl.type = 'password'
					text
						.setValue(this.plugin.settings.password)
						.onChange(async (value) => {
							this.plugin.settings.password = value;
							await this.plugin.saveSettings();
						})
				})
		});
		group.addSetting((setting) => {
			setting
				.setName("Client ID")
				.addText((text) => {
					text
						.setValue(this.plugin.settings.clientId)
						.onChange(async (value) => {
							this.plugin.settings.clientId = value.trim();
							await this.plugin.saveSettings();
						})
				})
		});
		group.addSetting((setting) => {
			setting
				.setName("Client secret")
				.addText((text) => {
					text.inputEl.type = 'password';
					text
						.setValue(this.plugin.settings.clientSecret)
						.onChange(async (value) => {
							this.plugin.settings.clientSecret = value.trim();
							await this.plugin.saveSettings();
						})
				})
		});
		group.addSetting((setting) => {
			setting
				.setName("Connection")
				.setDesc("Verify your credentials and authenticate, or test if the instance is up")
				.addButton((btn) => {
					btn.setButtonText("Connect").onClick(() => {
						void this.plugin.connectToWallabag();
					})
				})
				.addButton((btn) => {
					btn.setButtonText("Test").onClick(() => {
						void this.plugin.testWallabag();
					})
				})
		})
	}
}
