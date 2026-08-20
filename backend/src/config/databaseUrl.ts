/** Encodes reserved characters in a raw PostgreSQL password from .env. */
export function normalizeDatabaseUrl(value: string | undefined) {
  if (!value) return value;
  const match = value.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.+)@(.+)$/);
  if (!match || /%[0-9A-Fa-f]{2}/.test(match[3])) return value;
  return `${match[1]}${match[2]}:${encodeURIComponent(match[3])}@${match[4]}`;
}
