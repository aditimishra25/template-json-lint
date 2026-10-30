# template-json-lint

Validate JSON templates containing unresolved placeholders without modifying the original source.

`template-json-lint` validates JSON documents before template variables are resolved. It supports standalone placeholders and placeholders embedded inside JSON strings.

## Features

- Validate JSON containing unresolved template placeholders.
- Support double-curly placeholders such as `{{user.name}}`.
- Support angle-bracket placeholders such as `<user.name>`.
- Preserve placeholders embedded inside JSON strings.
- Report syntax errors with line, column, and source position.
- Preserve the original input.
- Written in TypeScript.
- Supports ESM and CommonJS.
- Zero runtime dependencies.

## Installation

```bash
npm install template-json-lint
```

## Usage

```typescript
import { lintJsonWithTemplates } from 'template-json-lint';

const source = `{
  "url": {{env.API_URL}},
  "user": <user.name>,
  "message": "Hello {{user.name}}"
}`;

const result = lintJsonWithTemplates(source);

console.log(result);
```

Successful validation returns:

```json
{
  "valid": true,
  "errors": []
}
```

## Supported placeholders

### Double-curly placeholders

```json
{
  "url": {{env.API_URL}},
  "message": "Hello {{user.name}}"
}
```

### Angle-bracket placeholders

```json
{
  "data": <user.profile>,
  "message": "Hello <user.name>"
}
```

### Mixed placeholders

```json
{
  "url": {{env.API_URL}},
  "data": <user.profile>,
  "message": "Hello {{user.name}}"
}
```

Placeholders are treated as opaque values. This package does not resolve variables or verify whether referenced values exist.

Angle-bracket placeholders use a conservative identifier/path syntax. They are intended for template references, not arbitrary HTML or comparison expressions.

## Error handling

Invalid JSON returns structured errors:

```typescript
const result = lintJsonWithTemplates(`{
  "name":,
  "age": 28
}`);

console.log(result);
```

Each error contains:

- `message`: JSON parser error message.
- `line`: Error line number, starting at 1.
- `column`: Error column number, starting at 1.
- `position`: Zero-based character position in the original source.

## API

### `lintJsonWithTemplates(source: string): JsonLintResult`

Validates a JSON string containing supported placeholders.

### `JsonLintResult`

```typescript
interface JsonLintResult {
  valid: boolean;
  errors: JsonLintError[];
}
```

### `JsonLintError`

```typescript
interface JsonLintError {
  message: string;
  line: number;
  column: number;
  position: number;
}
```

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## License

MIT
