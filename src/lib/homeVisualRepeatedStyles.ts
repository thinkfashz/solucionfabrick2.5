import type { HomeVisualSection, HomeVisualSectionStyle } from './homeVisualCms';
import type { AdvancedHomeVisualStyle, VisualElementStyle } from './homeVisualLayout';
import type { VisualContainerStyle } from './homeVisualContainers';

interface RepeatedAwareStyle extends AdvancedHomeVisualStyle {
  containers?: Record<string, VisualContainerStyle>;
}

export type RepeatedItemAction = 'move-up' | 'move-down' | 'duplicate';

export interface RepeatedItemPosition {
  key: string;
  index: number;
  length: number;
}

export interface RepeatedItemMutationResult {
  section: HomeVisualSection;
  selectedField: string;
}

/**
 * Remaps per-item element/container styles after a repeated content array changes.
 * `sources[newIndex]` points to the old index whose visual styles should follow
 * the item into its new position. Use null for a brand-new item.
 */
export function remapRepeatedItemStyles(
  style: HomeVisualSectionStyle,
  key: string,
  sources: Array<number | null>,
): HomeVisualSectionStyle {
  const current = style as RepeatedAwareStyle;
  const oldElements = current.elements || {};
  const oldContainers = current.containers || {};
  const elementPattern = new RegExp(`^${escapeRegExp(key)}-(\\d+)(.*)$`);
  const containerPattern = new RegExp(`^${escapeRegExp(key)}-(\\d+)$`);

  const elements: Record<string, VisualElementStyle> = {};
  for (const [name, value] of Object.entries(oldElements)) {
    if (!elementPattern.test(name)) elements[name] = value;
  }

  const containers: Record<string, VisualContainerStyle> = {};
  for (const [name, value] of Object.entries(oldContainers)) {
    if (!containerPattern.test(name)) containers[name] = value;
  }

  sources.forEach((sourceIndex, newIndex) => {
    if (sourceIndex === null) return;
    for (const [name, value] of Object.entries(oldElements)) {
      const match = name.match(elementPattern);
      if (!match || Number(match[1]) !== sourceIndex) continue;
      elements[`${key}-${newIndex}${match[2]}`] = cloneElement(value);
    }
    const card = oldContainers[`${key}-${sourceIndex}`];
    if (card) containers[`${key}-${newIndex}`] = cloneContainer(card);
  });

  return {
    ...current,
    elements,
    containers,
  } as HomeVisualSectionStyle;
}

export function identitySources(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

export function movedSources(length: number, index: number, direction: -1 | 1): number[] {
  const sources = identitySources(length);
  const target = index + direction;
  if (index < 0 || index >= length || target < 0 || target >= length) return sources;
  [sources[index], sources[target]] = [sources[target], sources[index]];
  return sources;
}

/** Moves one old index to any target position while preserving the order of the rest. */
export function relocatedSources(length: number, from: number, to: number): number[] {
  const sources = identitySources(length);
  if (from < 0 || from >= length || to < 0 || to >= length || from === to) return sources;
  const [moved] = sources.splice(from, 1);
  sources.splice(to, 0, moved);
  return sources;
}

export function deletedSources(length: number, index: number): number[] {
  return identitySources(length).filter((item) => item !== index);
}

export function duplicatedSources(length: number, index: number): number[] {
  const sources = identitySources(length);
  if (index < 0 || index >= length) return sources;
  sources.splice(index + 1, 0, index);
  return sources;
}

export function appendedSources(length: number): Array<number | null> {
  return [...identitySources(length), null];
}

export function getRepeatedItemPosition(section: HomeVisualSection, container: string): RepeatedItemPosition | null {
  const parsed = parseRepeatedContainer(container);
  if (!parsed) return null;
  const value = section.content[parsed.key];
  if (!Array.isArray(value) || parsed.index < 0 || parsed.index >= value.length) return null;
  return { ...parsed, length: value.length };
}

/**
 * Shared mutation used by both the inspector and the in-preview contextual toolbar.
 * The visual state is remapped with the repeated item so typography/container styles
 * never remain attached to the old array index.
 */
export function mutateRepeatedItem(
  section: HomeVisualSection,
  container: string,
  action: RepeatedItemAction,
): RepeatedItemMutationResult | null {
  const position = getRepeatedItemPosition(section, container);
  if (!position) return null;
  const list = section.content[position.key] as unknown[];

  let sources: number[];
  let target = position.index;

  if (action === 'move-up') {
    if (position.index <= 0) return null;
    sources = movedSources(position.length, position.index, -1);
    target = position.index - 1;
  } else if (action === 'move-down') {
    if (position.index >= position.length - 1) return null;
    sources = movedSources(position.length, position.index, 1);
    target = position.index + 1;
  } else {
    sources = duplicatedSources(position.length, position.index);
    target = position.index + 1;
  }

  const next = sources.map((sourceIndex, newIndex) => {
    const item = list[sourceIndex];
    if (action === 'duplicate' && newIndex === target) return cloneContentItem(item);
    return item;
  });

  return {
    section: {
      ...section,
      content: { ...section.content, [position.key]: next },
      style: remapRepeatedItemStyles(section.style, position.key, sources),
    },
    selectedField: `${position.key}-${target}-container`,
  };
}

function parseRepeatedContainer(container: string): { key: string; index: number } | null {
  const match = container.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  const index = Number(match[2]);
  if (!Number.isInteger(index) || index < 0) return null;
  return { key: match[1], index };
}

function cloneContentItem(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => cloneContentItem(item));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cloneContentItem(item)]));
}

function cloneElement(value: VisualElementStyle): VisualElementStyle {
  return {
    ...value,
    responsive: value.responsive
      ? Object.fromEntries(Object.entries(value.responsive).map(([device, item]) => [device, item ? { ...item } : item])) as VisualElementStyle['responsive']
      : undefined,
  };
}

function cloneContainer(value: VisualContainerStyle): VisualContainerStyle {
  return {
    ...value,
    responsive: value.responsive
      ? Object.fromEntries(Object.entries(value.responsive).map(([device, item]) => [device, item ? { ...item } : item])) as VisualContainerStyle['responsive']
      : undefined,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
