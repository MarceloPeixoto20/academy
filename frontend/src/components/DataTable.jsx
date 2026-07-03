import { useMemo, useState } from "react";

export default function DataTable({ columns, rows, empty = "Nenhum registro encontrado", searchable = true }) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => columns.some((column) => {
      if (column.render) return false;
      return String(row[column.key] ?? "").toLowerCase().includes(term);
    }));
  }, [rows, columns, search]);

  return (
    <div className="table-card">
      {searchable && (
        <div className="table-search">
          <input placeholder="Buscar na tabela..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <small>{filteredRows.length} registro(s)</small>
        </div>
      )}
      <table>
        <thead>
          <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 && (
            <tr><td colSpan={columns.length}>{empty}</td></tr>
          )}
          {filteredRows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
