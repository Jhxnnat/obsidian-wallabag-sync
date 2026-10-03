import Mustache from 'mustache';
import type { WallabagAnnotation, WallabagEntry } from './client';

Mustache.escape = (value: string) => value;

export interface HighlightView {
	text: string;
	note: string;
	link: string;
	blockId: string;
	annotationId: number;
	created: string;
	updated: string;
}

export function renderHighlight(
	template: string,
	entry: WallabagEntry,
	annotation: WallabagAnnotation,
): string {
	const view: HighlightView = {
		text: annotation.quote ?? '',
		note: annotation.text ?? '',
		link: entry.url ?? '',
		blockId: `^h${annotation.id}`,
		annotationId: annotation.id,
		created: annotation.created_at ?? '',
		updated: annotation.updated_at ?? '',
	};
	return Mustache.render(template, view).trim();
}
