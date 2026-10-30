import { describe, expect, it } from 'vitest';
import { lintJsonWithTemplates } from '../src/index.js';

describe('lintJsonWithTemplates', () => {
  describe('valid JSON', () => {
    it('accepts ordinary valid JSON', () => {
      expect(lintJsonWithTemplates('{"name":"Aditi","age":28}').valid).toBe(true);
    });

    it('accepts standalone double-curly placeholders as values', () => {
      expect(lintJsonWithTemplates('{"url":{{env.API_URL}}}').valid).toBe(true);
    });

    it('accepts standalone angle-bracket placeholders as values', () => {
      expect(lintJsonWithTemplates('{"data":<node.output>}').valid).toBe(true);
    });

    it('accepts placeholders embedded inside JSON strings', () => {
      expect(
        lintJsonWithTemplates('{"message":"Hello {{user.name}}"}').valid,
      ).toBe(true);
    });

    it('accepts multiple placeholder formats in one document', () => {
      const source =
        '{"url":{{env.API_URL}},"data":<node.output>,"message":"Hello {{user.name}}"}';

      expect(lintJsonWithTemplates(source).valid).toBe(true);
    });

    it('accepts placeholders inside nested JSON structures', () => {
      const source =
        '{"request":{"url":{{env.URL}},"headers":{"token":"{{env.TOKEN}}"}}}';

      expect(lintJsonWithTemplates(source).valid).toBe(true);
    });
  });

  describe('invalid JSON', () => {
    it('rejects a missing value', () => {
      expect(lintJsonWithTemplates('{"name":}').valid).toBe(false);
    });

    it('rejects a trailing comma', () => {
      expect(lintJsonWithTemplates('{"name":"A",}').valid).toBe(false);
    });

    it('rejects an unclosed object', () => {
      expect(lintJsonWithTemplates('{"name":"A"').valid).toBe(false);
    });

    it('rejects malformed JSON strings', () => {
      expect(lintJsonWithTemplates('{"name":"A}').valid).toBe(false);
    });
  });

  describe('error locations', () => {
    it('reports the original source line and column', () => {
      const result = lintJsonWithTemplates('{\n  "name":,\n  "age": 28\n}');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].column).toBeGreaterThan(0);
    });
  });

  describe('input handling', () => {
    it('does not modify the original source', () => {
      const source = '{"url":{{env.API_URL}}}';
      const original = source;

      lintJsonWithTemplates(source);

      expect(source).toBe(original);
    });

    it('accepts an empty JSON object', () => {
      expect(lintJsonWithTemplates('{}').valid).toBe(true);
    });

    it('accepts an empty JSON array', () => {
      expect(lintJsonWithTemplates('[]').valid).toBe(true);
    });
  });

describe('edge cases', () => {
  it('accepts escaped quotes before a placeholder', () => {
    const source = '{"message":"Say \\"hello\\" to {{user.name}}"}';

    expect(lintJsonWithTemplates(source).valid).toBe(true);
  });

  it('rejects invalid escape sequences', () => {
    expect(lintJsonWithTemplates('{"message":"hello\\x"}').valid).toBe(false);
  });

  it('rejects malformed numbers', () => {
    expect(lintJsonWithTemplates('{"amount":01}').valid).toBe(false);
  });

  it('accepts placeholders immediately before JSON punctuation', () => {
    const source = '{"first":{{user.first}},"second":<user.second>}';

    expect(lintJsonWithTemplates(source).valid).toBe(true);
  });

  it('reports the correct line for errors after a placeholder', () => {
    const source = '{\n  "url": {{env.URL}},\n  "name":,\n}';
    const result = lintJsonWithTemplates(source);

    expect(result.valid).toBe(false);
    expect(result.errors[0].line).toBe(3);
  });
});
});