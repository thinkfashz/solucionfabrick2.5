import { describe, it, expect } from 'vitest';
import { parseSqlBlocks } from '@/lib/sqlBlocks';

describe('parseSqlBlocks', () => {
  it('returns empty array for empty input', () => {
    expect(parseSqlBlocks('')).toEqual([]);
    expect(parseSqlBlocks('\n\n')).toEqual([]);
  });

  it('ignores SQL with no markers', () => {
    expect(parseSqlBlocks('CREATE TABLE foo (id int);')).toEqual([]);
  });

  it('splits a single TABLA block', () => {
    const sql = `-- TABLA: products\nCREATE TABLE IF NOT EXISTS products (id int);`;
    expect(parseSqlBlocks(sql)).toEqual([
      { name: 'products', query: 'CREATE TABLE IF NOT EXISTS products (id int);' },
    ]);
  });

  it('splits multiple TABLA blocks and trims each', () => {
    const sql = [
      '-- TABLA: products',
      'CREATE TABLE products (id int);',
      '',
      '-- TABLA: orders',
      'CREATE TABLE orders (id int);',
      '',
    ].join('\n');
    const blocks = parseSqlBlocks(sql);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      name: 'products',
      query: 'CREATE TABLE products (id int);',
    });
    expect(blocks[1]).toEqual({
      name: 'orders',
      query: 'CREATE TABLE orders (id int);',
    });
  });

  it('strips parenthetical suffix from the table name', () => {
    const sql = `-- TABLA: posts (blog)\nCREATE TABLE posts (id int);`;
    expect(parseSqlBlocks(sql)[0].name).toBe('posts');
  });

  it('prefixes SEED blocks with "seed:" and strips parenthetical suffix', () => {
    const sql = [
      '-- SEED: categories (default)',
      "INSERT INTO categories VALUES ('a');",
    ].join('\n');
    expect(parseSqlBlocks(sql)[0]).toEqual({
      name: 'seed:categories',
      query: "INSERT INTO categories VALUES ('a');",
    });
  });

  it('skips blocks whose body is empty or whitespace', () => {
    const sql = [
      '-- TABLA: empty',
      '',
      '   ',
      '-- TABLA: filled',
      'SELECT 1;',
    ].join('\n');
    const blocks = parseSqlBlocks(sql);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].name).toBe('filled');
  });

  it('handles CRLF line endings', () => {
    const sql = '-- TABLA: products\r\nCREATE TABLE products (id int);\r\n';
    expect(parseSqlBlocks(sql)).toEqual([
      { name: 'products', query: 'CREATE TABLE products (id int);' },
    ]);
  });

  it('matches markers case-insensitively', () => {
    const sql = '-- tabla: products\nSELECT 1;';
    expect(parseSqlBlocks(sql)[0].name).toBe('products');
  });
});
