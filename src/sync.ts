import { App, normalizePath, Notice, TFile, TFolder } from 'obsidian';
import type WallabagSyncPlugin from './main';
import type { WallabagEntry } from './client';
import { renderHighlight } from './template';
import { DEFAULT_SETTINGS } from './settings';

interface HighlightBlock {
	id: number;
	text: string;
}

export async function syncNotes(plugin: WallabagSyncPlugin): Promise<{count: number}> {
	let count: number = 0;
	const client = plugin.createClient();
	const folder = await ensureFolder(plugin.app, plugin.settings.notesFolder);

	for (const entry of await client.getEntriesWithAnnotations()) {
		try {
			const blocks: HighlightBlock[] = entry.annotations
				.map((annotation) => (
					{
						id: annotation.id,
						text: renderHighlight(plugin.settings.noteTemplate, entry, annotation)
					}
				)).filter((block) => block.text.length > 0);

			await writeNote(plugin.app, folder, entry, blocks);
			count++;
		} catch (error) {
			new Notice(`${entry.title || entry.id}: ${message(error)}`);
		}
	}
	return { count };
}

async function writeNote(
	app: App,
	folder: TFolder,
	entry: WallabagEntry,
	blocks: HighlightBlock[],
): Promise<{ count: number }> {
	const base = normalizeTitle(entry.title);
	let path = normalizePath(`${folder.path}/${base}.md`);
	let existing = app.vault.getAbstractFileByPath(path);

	if (existing instanceof TFile) {
		const content = await app.vault.read(existing);
		return updateHightlights(app, existing, content, entry, blocks);
	}
	if (existing) { // its a directory
		throw new Error(`"${path}" exists and is not a note.`);
	}
	await app.vault.create(path, buildNewNote(entry, blocks));
	return {count: 1};
}

// TODO: check by blockId: ^h{id} ?
// ISSUE: this does not update notes
async function updateHightlights(
	app: App,
	file: TFile,
	content: string,
	entry: WallabagEntry,
	blocks: HighlightBlock[],
): Promise<{ count: number }> {
	let count: number = 0;
	for (const i of blocks) {
		if (!content.contains(i.text)) {
			await app.vault.append(file, "\n" + i.text + "\n");
			count++;
		}
	}
	return { count };
}

function buildNewNote(entry: WallabagEntry, blocks: HighlightBlock[]): string {
	const frontmatter = buildFrontmatter(entry);
	const body = blocks.map((block) => block.text).join('\n\n');
	return `${frontmatter}\n${body}\n`;
}

interface FrontmatterData {
	title: string;
	url: string;
	author?: string;
	date?: string;
	pdate?: string;
	wallabag_id: number;
	tags: string[];
}

function buildFrontmatter(entry: WallabagEntry): string {
	const data = getFrontmatterData(entry);
	//NOTE: I had a bug with title not being plaintext sometimes
	// so json stringify fixed it
	let text = `---
title: ${JSON.stringify(data.title)}
url: ${data.url}
author: ${data.author ?? ""}
created: ${data.date ?? ""}
published: ${data.pdate ?? ""}
wallabag_id: ${data.wallabag_id}
`
	text += "tags:\n"
	for (const label of data.tags) {
		text += `  - ${label}\n`
	}
	text += "---"
	return text;
}

function getFrontmatterData(entry: WallabagEntry): FrontmatterData {
	const data: FrontmatterData = {
		title: entry.title,
		wallabag_id: entry.id,
		tags: getTags(entry),
		url: entry.url,
		author: entry.published_by?.join(', '),
		date: getISODate(entry.created_at),
		pdate: getISODate(entry.published_at)
	};
	return data;
}

function getTags(entry: WallabagEntry): string[] {
	const tags: string[] = [];
	if (entry.tags) {
		for (let i = 0; i < entry.tags.length; i++) {
			const label = entry.tags[i]?.label
			if (label) tags.push(label);
		}
	}
	return tags;
}

function normalizeTitle(title: string): string {
	const cleanTitle = (title || 'No Title')
		.replace(/[^\w\s\-.']/g, '').trim().slice(0, 100);
	return cleanTitle;
}

// date in YYYY-MM-DD format
function getISODate(value?: string): string {
	if (!value) return "";
	const date = new Date(value).toISOString().split('T')[0];
	return date ?? "";
}

async function ensureFolder(app: App, folder: string): Promise<TFolder> {
	const path = normalizePath(folder.trim() || DEFAULT_SETTINGS.notesFolder);
	let current: TFolder | null = null;
	let prefix = '';

	for (const part of path.split('/')) {
		if (!part || part === '.') {
			continue;
		}
		prefix = prefix ? `${prefix}/${part}` : part;
		const existing = app.vault.getAbstractFileByPath(prefix);
		if (existing instanceof TFolder) {
			current = existing;
			continue;
		}
		else if (existing instanceof TFile) {
			throw new Error(`"${prefix}" folder path is actually a file.`);
		}
		current = await app.vault.createFolder(prefix);
	}
	if (!current) {
		throw new Error('Set a notes folder first.');
	}
	return current;
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
