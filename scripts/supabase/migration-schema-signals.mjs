const sqlIdentifier = String.raw`(?:"(?:[^"]|"")*"|[a-z_][a-z0-9_$]*)`;

const createTablePattern = new RegExp(
  String.raw`\bcreate\s+(?:(temporary|temp|unlogged)\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:(${sqlIdentifier})\s*\.\s*)?(${sqlIdentifier})`,
  "giu",
);

const enableRlsPattern = new RegExp(
  String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:(${sqlIdentifier})\s*\.\s*)?(${sqlIdentifier})\s+enable\s+row\s+level\s+security\b`,
  "giu",
);

export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--.*$/gm, " ");
}

function normalizeIdentifier(identifier) {
  if (!identifier) return null;
  const value =
    identifier.startsWith('"') && identifier.endsWith('"')
      ? identifier.slice(1, -1).replace(/""/g, '"')
      : identifier;
  return value.toLowerCase();
}

export function extractCreatedPublicTableNames(sql) {
  const tables = new Set();
  const text = stripSqlComments(sql);

  for (const match of text.matchAll(createTablePattern)) {
    const persistence = match[1]?.toLowerCase() ?? null;
    const schema = normalizeIdentifier(match[2]);
    const table = normalizeIdentifier(match[3]);

    // Temporary tables are session-local and never become Data API tables.
    if (persistence === "temporary" || persistence === "temp") continue;
    // Unqualified tables retain the scanner's conservative public-schema default.
    if (schema !== null && schema !== "public") continue;
    if (table) tables.add(table);
  }

  return [...tables];
}

export function extractRlsEnabledPublicTableNames(sql) {
  const tables = new Set();
  const text = stripSqlComments(sql);

  for (const match of text.matchAll(enableRlsPattern)) {
    const schema = normalizeIdentifier(match[1]);
    const table = normalizeIdentifier(match[2]);
    if (schema !== null && schema !== "public") continue;
    if (table) tables.add(table);
  }

  return [...tables];
}

export function createsPublicTable(sql) {
  return extractCreatedPublicTableNames(sql).length > 0;
}

export function allCreatedPublicTablesHaveRls(sql) {
  const created = extractCreatedPublicTableNames(sql);
  if (!created.length) return false;
  const enabled = new Set(extractRlsEnabledPublicTableNames(sql));
  return created.every((table) => enabled.has(table));
}
