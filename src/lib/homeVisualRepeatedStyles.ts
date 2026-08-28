import type { HomeVisualSectionStyle } from './homeVisualCms';
import type { AdvancedHomeVisualStyle, VisualElementStyle } from './homeVisualLayout';
import type { VisualContainerStyle } from './homeVisualContainers';

interface RepeatedAwareStyle extends AdvancedHomeVisualStyle {
  containers?: Record<string, VisualContainerStyle>;
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
