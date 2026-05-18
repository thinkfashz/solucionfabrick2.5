const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'public/sw.js',
      // Migrated from .eslintignore (flat config does not read that file)
      'src/components/admin/AdminActionGuard.tsx',
      'src/app/admin/vercel-logs/page.tsx',
      'src/components/calculadora/CalculadoraPreciosThree.tsx',
      'src/components/soluciones/SolucionesPageContent.tsx',
      'src/components/presupuesto/PresupuestoVisualizer.tsx',
      'src/components/ProjectBuilder.tsx',
      'src/components/LandingSections.tsx',
      'src/app/admin/observatory/MobileObservatory.tsx',
      'src/app/admin/editor/EditorClient.tsx',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-style-component-with-dynamic-styles': 'off',
      'jsx-a11y/aria-props': 'off',
      'jsx-a11y/aria-role': 'off',
    },
  },
];
