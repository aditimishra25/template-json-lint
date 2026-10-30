
export interface JsonLintError {
  message: string;
  line: number;
  column: number;
  position: number;
}

export interface JsonLintResult {
  valid: boolean;
  errors: JsonLintError[];
}

const PLACEHOLDER_AT_START =
  /^(?:\{\{[^{}\r\n]+\}\}|<[A-Za-z_$][\w$.-]*>)/;

function sanitizeTemplates(source: string): string {
  let sanitized = '';
  let index = 0;
  let insideString = false;
  let escaped = false;

  while (index < source.length) {
    const character = source[index];

    if (insideString) {
      sanitized += character;

      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        insideString = false;
      }

      index += 1;
      continue;
    }

    if (character === '"') {
      insideString = true;
      sanitized += character;
      index += 1;
      continue;
    }

    const match = PLACEHOLDER_AT_START.exec(source.slice(index));

    if (match) {
      const placeholder = match[0];
      sanitized += '0' + ' '.repeat(placeholder.length - 1);
      index += placeholder.length;
      continue;
    }

    sanitized += character;
    index += 1;
  }

  return sanitized;
}

class JsonSyntaxScanner {
  private position = 0;

  constructor(private readonly source: string) {}

  findErrorPosition(): number {
    try {
      this.skipWhitespace();
      this.parseValue();
      this.skipWhitespace();

      if (this.position < this.source.length) {
        this.fail();
      }
    } catch {
      return this.position;
    }

    return this.position;
  }

  private fail(): never {
    throw new Error('Invalid JSON');
  }

  private skipWhitespace(): void {
    while (
      this.position < this.source.length &&
      /[\u0020\t\n\r]/.test(this.source[this.position])
    ) {
      this.position += 1;
    }
  }

  private parseValue(): void {
    this.skipWhitespace();

    const character = this.source[this.position];

    if (character === '{') {
      this.parseObject();
    } else if (character === '[') {
      this.parseArray();
    } else if (character === '"') {
      this.parseString();
    } else if (character === 't') {
      this.parseLiteral('true');
    } else if (character === 'f') {
      this.parseLiteral('false');
    } else if (character === 'n') {
      this.parseLiteral('null');
    } else if (character === '-' || /[0-9]/.test(character ?? '')) {
      this.parseNumber();
    } else {
      this.fail();
    }
  }

  private parseObject(): void {
    this.position += 1;
    this.skipWhitespace();

    if (this.source[this.position] === '}') {
      this.position += 1;
      return;
    }

    while (true) {
      if (this.source[this.position] !== '"') {
        this.fail();
      }

      this.parseString();
      this.skipWhitespace();

      if (this.source[this.position] !== ':') {
        this.fail();
      }

      this.position += 1;
      this.parseValue();
      this.skipWhitespace();

      if (this.source[this.position] === '}') {
        this.position += 1;
        return;
      }

      if (this.source[this.position] !== ',') {
        this.fail();
      }

      this.position += 1;
      this.skipWhitespace();
    }
  }

  private parseArray(): void {
    this.position += 1;
    this.skipWhitespace();

    if (this.source[this.position] === ']') {
      this.position += 1;
      return;
    }

    while (true) {
      this.parseValue();
      this.skipWhitespace();

      if (this.source[this.position] === ']') {
        this.position += 1;
        return;
      }

      if (this.source[this.position] !== ',') {
        this.fail();
      }

      this.position += 1;
      this.skipWhitespace();
    }
  }

  private parseString(): void {
    this.position += 1;

    while (this.position < this.source.length) {
      const character = this.source[this.position];

      if (character === '"') {
        this.position += 1;
        return;
      }

      if (character.charCodeAt(0) < 0x20) {
        this.fail();
      }

      if (character === '\\') {
        this.position += 1;

        const escaped = this.source[this.position];

        if ('"\\/bfnrt'.includes(escaped ?? '')) {
          this.position += 1;
          continue;
        }

        if (escaped === 'u') {
          const hex = this.source.slice(
            this.position + 1,
            this.position + 5,
          );

          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            this.fail();
          }

          this.position += 5;
          continue;
        }

        this.fail();
      }

      this.position += 1;
    }

    this.fail();
  }

  private parseNumber(): void {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      this.source.slice(this.position),
    );

    if (!match) {
      this.fail();
    }

    this.position += match[0].length;
  }

  private parseLiteral(literal: string): void {
    if (!this.source.startsWith(literal, this.position)) {
      this.fail();
    }

    this.position += literal.length;
  }
}

function getLocation(
  source: string,
  position: number,
): { line: number; column: number } {
  const precedingText = source.slice(0, position);
  const lines = precedingText.split('\n');
  const lastLine = lines[lines.length - 1].replace(/\r$/, '');

  return {
    line: lines.length,
    column: lastLine.length + 1,
  };
}

export function lintJsonWithTemplates(
  source: string,
): JsonLintResult {
  const sanitized = sanitizeTemplates(source);

  try {
    JSON.parse(sanitized);

    return {
      valid: true,
      errors: [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid JSON';

    const position = new JsonSyntaxScanner(sanitized).findErrorPosition();
    const location = getLocation(source, position);

    return {
      valid: false,
      errors: [
        {
          message,
          position,
          ...location,
        },
      ],
    };
  }
}
