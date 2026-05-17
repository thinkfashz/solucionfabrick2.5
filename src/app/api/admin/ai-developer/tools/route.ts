import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminBlocked, recordAdminFailure } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SafeAction = 'read_repo_status' | 'propose_change' | 'prepare_branch_plan' | 'prepare_pr_plan';
type BlockedAction = 'merge' | 'deploy' | 'delete_branch' | 'delete_file' | 'write_main';
type ToolAction = SafeAction | BlockedAction;

type Body = {
  action?: ToolAction;
  prompt?: string;
  target?: string;
};

const SAFE_ACTIONS = new Set<ToolAction>(['read_repo_status', 'propose_change', 'prepare_branch_plan', 'prepare_pr_plan']);
const BLOCKED_ACTIONS = new Set<ToolAction>(['merge', 'deploy', 'delete_branch', 'delete_file', 'write_main']);

function normalizeAction(value: unknown): ToolAction | null {
  if (
    value === 'read_repo_status' ||
    value === 'propose_change' ||
    value === 'prepare_branch_plan' ||
    value === 'prepare_pr_plan' ||
    value === 'merge' ||
    value === 'deploy' ||
    value === 'delete_branch' ||
    value === 'delete_file' ||
    value === 'write_main'
  ) return value;
  return null;
}

function clean(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim().slice(0, 4000) : fallback;
}

function buildSafeResponse(action: SafeAction, prompt: string, target: string) {
  if (action === 'read_repo_status') {
    return {
      title: 'Lectura segura del repo',
      summary: 'Esta acción está permitida como lectura. La conexión directa a GitHub desde el panel se activará en la siguiente etapa usando credenciales auditadas.',
      nextSteps: [
        'Leer rama actual y PR activo.',
        'Revisar archivos relacionados con el módulo solicitado.',
        'Responder con hallazgos sin modificar código.',
      ],
    };
  }

  if (action === 'propose_change') {
    return {
      title: 'Propuesta de cambio',
      summary: 'Se generó una estructura segura de propuesta. No se modificaron archivos desde esta herramienta.',
      target: target || 'sin ruta específica',
      prompt,
      nextSteps: [
        'Describir problema real.',
        'Listar archivos probables.',
        'Separar cambio en etapas pequeñas.',
        'Crear PR revisable cuando el usuario confirme.',
      ],
    };
  }

  if (action === 'prepare_branch_plan') {
    return {
      title: 'Plan de rama',
      branchNameSuggestion: `feature/${(target || 'ai-change').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'ai-change'}`,
      nextSteps: [
        'Crear rama desde main actualizado.',
        'Aplicar cambios mínimos.',
        'Documentar en docs/changes.',
        'Ejecutar typecheck/lint/build antes de PR.',
      ],
    };
  }

  return {
    title: 'Plan de PR',
    summary: 'Preparación segura de Pull Request. Esta herramienta no mergea ni despliega.',
    checklist: [
      'Título claro con prefijo feat/fix/docs.',
      'Descripción de archivos tocados.',
      'Riesgos conocidos.',
      'Pruebas ejecutadas o pendientes.',
      'Confirmación de que no toca producción directo.',
    ],
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'read' });
  if (!auth.ok) return auth.response;

  if (auth.role === 'viewer') {
    await recordAdminBlocked({ session: auth.session, request, action: 'read', resource: 'admin', metadata: { module: 'ai-developer-tools', reason: 'viewer_blocked' } });
    return NextResponse.json({ error: 'Modo demo: herramientas AI Developer bloqueadas.' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const action = normalizeAction(body.action);
  if (!action) return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });

  const prompt = clean(body.prompt);
  const target = clean(body.target);

  if (BLOCKED_ACTIONS.has(action)) {
    await recordAdminBlocked({
      session: auth.session,
      request,
      action: 'execute',
      resource: 'admin',
      metadata: { module: 'ai-developer-tools', requestedAction: action, target },
    });
    return NextResponse.json({
      error: 'Acción bloqueada por política de seguridad.',
      blocked: true,
      action,
      reason: 'Fabrick AI Developer no puede hacer merge, deploy, borrar ramas/archivos ni escribir directo en main.',
    }, { status: 403 });
  }

  if (!SAFE_ACTIONS.has(action)) {
    await recordAdminFailure({ session: auth.session, request, action: 'execute', resource: 'admin', metadata: { module: 'ai-developer-tools', requestedAction: action } });
    return NextResponse.json({ error: 'Acción no permitida.' }, { status: 400 });
  }

  const result = buildSafeResponse(action as SafeAction, prompt, target);
  await recordAdminAudit({
    session: auth.session,
    request,
    action: 'execute',
    resource: 'admin',
    metadata: { module: 'ai-developer-tools', action, target, promptLength: prompt.length },
  });

  return NextResponse.json({ ok: true, action, result });
}
