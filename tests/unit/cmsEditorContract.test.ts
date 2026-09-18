import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_VISUAL_CMS_OVERRIDES,
  normalizeVisualCmsOverrides,
  removeVisualElement,
  upsertVisualElement,
} from '@/lib/visualCmsOverrides';
import { DEFAULT_HOME_PAGE, normalizeHomePage } from '@/lib/homeVisualCms';

describe('Fabrick Studio v2 editor contract', () => {
  it('migrates legacy visual overrides to schema v2 without losing selector compatibility', () => {
    const legacy = {
      schemaVersion: 1,
      pages: {
        '/tienda': {
          route: '/tienda',
          elements: {
            '.hero h1': {
              selector: '.hero h1',
              text: 'Título heredado',
            },
          },
        },
      },
    };

    const normalized = normalizeVisualCmsOverrides(legacy);
    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.pages['/tienda'].elements['.hero h1'].text).toBe('Título heredado');
    expect(normalized.pages['/tienda'].elements['.hero h1'].selector).toBe('.hero h1');
  });

  it('persists stable cms identity, granular locks and reversible trash metadata', () => {
    const next = upsertVisualElement(
      DEFAULT_VISUAL_CMS_OVERRIDES,
      '/tienda',
      '[data-cms-id="store-hero-title"]',
      {
        cmsId: 'store-hero-title',
        text: 'Nuevo título',
        lock: { content: true, remove: true },
        trashed: true,
        trashedAt: '2026-09-17T20:00:00.000Z',
        styles: { mobile: { fontSize: '32px' } },
      },
    );

    const element = next.pages['/tienda'].elements['[data-cms-id="store-hero-title"]'];
    expect(element.cmsId).toBe('store-hero-title');
    expect(element.lock).toMatchObject({ content: true, remove: true });
    expect(element.trashed).toBe(true);
    expect(element.styles?.mobile?.fontSize).toBe('32px');

    const unlocked = upsertVisualElement(next, '/tienda', element.selector, {
      lock: { content: false },
    });
    expect(unlocked.pages['/tienda'].elements[element.selector].lock).toMatchObject({
      content: false,
      remove: true,
    });

    const reset = removeVisualElement(unlocked, '/tienda', element.selector);
    expect(reset.pages['/tienda']).toBeUndefined();
  });

  it('preserves home section lock and trash metadata through normalization', () => {
    const hero = DEFAULT_HOME_PAGE.sections[0];
    const normalized = normalizeHomePage({
      schemaVersion: 2,
      sections: [
        {
          ...hero,
          enabled: false,
          editor: {
            lock: { move: true, remove: true, content: true, style: true },
            trashed: true,
            trashedAt: '2026-09-17T20:00:00.000Z',
          },
        },
      ],
    });

    const savedHero = normalized.sections.find((section) => section.id === hero.id);
    expect(savedHero?.enabled).toBe(false);
    expect(savedHero?.editor?.trashed).toBe(true);
    expect(savedHero?.editor?.lock).toEqual({
      move: true,
      remove: true,
      content: true,
      style: true,
    });
  });

  it('keeps runtime fallback and trash safeguards wired into both editor engines', () => {
    const visualRuntime = readFileSync('src/components/cms/VisualCmsRuntime.tsx', 'utf8');
    const homeRuntime = readFileSync('src/components/cms/HomeVisualRuntime.tsx', 'utf8');
    const bridge = readFileSync('src/app/admin/editor/VisualCmsHomeStructureBridge.tsx', 'utf8');
    const homeEditor = readFileSync('src/app/admin/editor/HomeVisualEditorClient.tsx', 'utf8');

    expect(visualRuntime).toContain('elementsForOverride');
    expect(visualRuntime).toContain('override.cmsId');
    expect(visualRuntime).toContain('override.trashed === true');
    expect(homeRuntime).toContain('section.editor?.trashed !== true');
    expect(bridge).toContain('section.editor?.lock?.remove === true');
    expect(bridge).toContain('trashedAt: new Date().toISOString()');
    expect(homeEditor).toContain('TouchSensor');
    expect(homeEditor).toContain('delay: 220');
    expect(homeEditor).toContain('SortableContext');
  });
  it('connects the contextual editor directly to the real CMS state and mounts all page tools', () => {
    const universal = readFileSync('src/app/admin/editor/UniversalVisualEditorClient.tsx', 'utf8');
    const contextual = readFileSync('src/app/admin/editor/VisualCmsContextEditorBridge.tsx', 'utf8');
    const unified = readFileSync('src/app/admin/editor/UnifiedCmsEditorClient.tsx', 'utf8');

    expect(universal).toContain("cms:visual-editor-direct");
    expect(universal).toContain("cms:visual-editor-selection-sync");
    expect(universal).toContain("cms:visual-editor-target");
    expect(contextual).toContain("sendDirectEditorAction('color'");
    expect(contextual).toContain("sendDirectEditorAction('background'");
    expect(contextual).toContain("[data-visual-cms-editor-root=\"1\"]");
    expect(unified).toContain('<VisualCmsContextEditorBridge />');
    expect(unified).toContain('<VisualCmsCloudinaryBridge />');
    expect(unified).toContain('<VisualCmsCloudinaryPolish />');
  });

  it('keeps the page editor full-screen and exposes real Cloudinary folders plus touch image scaling', () => {
    const universal = readFileSync('src/app/admin/editor/UniversalVisualEditorClient.tsx', 'utf8');
    const cloudinary = readFileSync('src/app/admin/editor/VisualCmsCloudinaryBridge.tsx', 'utf8');
    const cloudinaryApi = readFileSync('src/app/api/admin/cloudinary/route.ts', 'utf8');
    const visualRuntime = readFileSync('src/components/cms/VisualCmsRuntime.tsx', 'utf8');

    expect(universal).toContain('fixed inset-0 z-[90]');
    expect(universal).toContain('canvasBounds.width / canvasWidth');
    expect(universal).toContain('bg-[#050506] p-0');
    expect(cloudinaryApi).toContain("view === 'folders'");
    expect(cloudinaryApi).toContain('foldersUrl');
    expect(cloudinary).toContain('openFolder');
    expect(cloudinary).toContain('asset.folder');
    expect(cloudinary).toContain('cms:visual-cloudinary-apply');
    expect(visualRuntime).toContain('selectedRef.current instanceof HTMLImageElement');
    expect(visualRuntime).toContain("style.setProperty('transform'");
  });

});
