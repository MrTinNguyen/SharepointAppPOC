// SharePoint REST OData: apostrophes inside string literals must be doubled,
// then the whole value URL-encoded once.
export function odataStringLiteral(value: string): string {
  return encodeURIComponent(value.replace(/'/g, "''"));
}

// Field names in $orderby/$select must be simple identifiers (letters, digits, underscore).
// Anything else is rejected to prevent injection into the query string.
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertODataIdentifier(value: string, context: string): void {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`Invalid ${context}: "${value}"`);
  }
}
