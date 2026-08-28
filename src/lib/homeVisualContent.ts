export function getContentFieldValue(content: Record<string, unknown>, field: string): unknown {
  if (typeof content[field] === 'string') return content[field];

  const objectPath = field.match(/^(.+)-(\d+)-(title|text)$/);
  if (objectPath) {
    const [, key, rawIndex, prop] = objectPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && list[index] && typeof list[index] === 'object' && !Array.isArray(list[index])) {
      return (list[index] as Record<string, unknown>)[prop];
    }
  }

  const stringPath = field.match(/^(.+)-(\d+)$/);
  if (stringPath) {
    const [, key, rawIndex] = stringPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && typeof list[index] === 'string') return list[index];
  }

  return undefined;
}

export function patchContentField(content: Record<string, unknown>, field: string, value: string): Record<string, unknown> {
  if (typeof content[field] === 'string') return { ...content, [field]: value };

  const objectPath = field.match(/^(.+)-(\d+)-(title|text)$/);
  if (objectPath) {
    const [, key, rawIndex, prop] = objectPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && list[index] && typeof list[index] === 'object' && !Array.isArray(list[index])) {
      const next = [...list];
      next[index] = { ...(next[index] as Record<string, unknown>), [prop]: value };
      return { ...content, [key]: next };
    }
  }

  const stringPath = field.match(/^(.+)-(\d+)$/);
  if (stringPath) {
    const [, key, rawIndex] = stringPath;
    const list = content[key];
    const index = Number(rawIndex);
    if (Array.isArray(list) && typeof list[index] === 'string') {
      const next = [...list];
      next[index] = value;
      return { ...content, [key]: next };
    }
  }

  return content;
}

export function isEditableContentField(content: Record<string, unknown>, field: string): boolean {
  return typeof getContentFieldValue(content, field) === 'string';
}
