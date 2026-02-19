export interface InferredRelationshipRow {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
  update_rule: string | null;
  delete_rule: string | null;
}

type ColumnRow = {
  table_name: string;
  column_name: string;
};

function getTargetCandidates(base: string): string[] {
  const candidates = new Set<string>();
  candidates.add(base);
  candidates.add(`${base}s`);
  if (base.endsWith("y") && base.length > 1) {
    candidates.add(`${base.slice(0, -1)}ies`);
  }
  return Array.from(candidates);
}

export function inferRelationships(columns: ColumnRow[]): InferredRelationshipRow[] {
  const byTable = new Map<string, Set<string>>();
  for (const col of columns) {
    const table = col.table_name.toLowerCase();
    const column = col.column_name.toLowerCase();
    if (!byTable.has(table)) byTable.set(table, new Set());
    byTable.get(table)!.add(column);
  }

  const results: InferredRelationshipRow[] = [];
  const seen = new Set<string>();

  for (const col of columns) {
    const sourceTable = col.table_name.toLowerCase();
    const sourceColumn = col.column_name.toLowerCase();
    if (!sourceColumn.endsWith("_id") || sourceColumn === "id") continue;

    const base = sourceColumn.replace(/_id$/, "");
    const candidates = getTargetCandidates(base);

    for (const targetTable of candidates) {
      if (targetTable === sourceTable) continue;
      const targetCols = byTable.get(targetTable);
      if (!targetCols) continue;

      const candidateTargetColumns = ["id", `${base}_id`, `${targetTable}_id`];
      const targetColumn = candidateTargetColumns.find((c) => targetCols.has(c));
      if (!targetColumn) continue;

      const key = `${sourceTable}.${sourceColumn}->${targetTable}.${targetColumn}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        constraint_name: `inferred_${sourceTable}_${sourceColumn}__${targetTable}_${targetColumn}`,
        source_table: sourceTable,
        source_column: sourceColumn,
        target_table: targetTable,
        target_column: targetColumn,
        update_rule: null,
        delete_rule: null,
      });
    }
  }

  return results.sort((a, b) => {
    const sourceCmp = a.source_table.localeCompare(b.source_table);
    if (sourceCmp !== 0) return sourceCmp;
    const colCmp = a.source_column.localeCompare(b.source_column);
    if (colCmp !== 0) return colCmp;
    return a.target_table.localeCompare(b.target_table);
  });
}
