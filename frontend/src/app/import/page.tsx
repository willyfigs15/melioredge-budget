"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label, Select } from "@/components/ui/Input";
import type { Budget, ImportRow } from "@/types";

type Preview = {
  filename: string;
  columns: string[];
  suggested_mapping: Record<string, string | null>;
  sample_rows: Array<{ date: string | null; amount: string | null; description: string; type: string | null; raw: Record<string, string> }>;
  total_rows: number;
  _content_b64: string;
};

const FIELDS: Array<keyof Preview["suggested_mapping"]> = ["date", "amount", "description"];

export default function ImportPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [defaultCat, setDefaultCat] = useState<string>("");
  const [history, setHistory] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadHistory = async () => {
    const { data } = await api.get<ImportRow[]>("/api/imports");
    setHistory(data);
  };

  useEffect(() => {
    api.get<Budget[]>("/api/budgets").then((r) => setBudgets(r.data));
    loadHistory();
  }, []);

  const onFile = async (file: File) => {
    setErr(null);
    setPreview(null);
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post<Preview>("/api/imports/preview", fd);
      setPreview(data);
      setMapping(Object.fromEntries(Object.entries(data.suggested_mapping).filter(([, v]) => !!v)) as Record<string, string>);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Could not parse CSV.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    for (const f of FIELDS) {
      if (!mapping[f]) { setErr(`Pick a column for "${f}".`); return; }
    }
    setLoading(true);
    setErr(null);
    try {
      await api.post<ImportRow>("/api/imports/confirm", {
        filename: preview.filename,
        mapping,
        content_b64: preview._content_b64,
        default_category_id: defaultCat ? parseInt(defaultCat) : null,
      });
      setPreview(null);
      setMapping({});
      loadHistory();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const categories = budgets.flatMap((b) => b.categories);

  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-semibold">Import bank statement</h1>

      {!preview && (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-10 text-center">
            <Upload className="h-8 w-8 text-primary mb-3" />
            <p className="font-medium">Upload a CSV</p>
            <p className="text-sm text-muted-foreground mb-4">We'll auto-detect date, amount, and description.</p>
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
              <span className="inline-flex items-center justify-center h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90">
                Choose file
              </span>
            </label>
            {loading && <p className="mt-3 text-sm text-muted-foreground">Parsing…</p>}
          </CardBody>
        </Card>
      )}

      {preview && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{preview.filename}</CardTitle>
            <span className="text-xs text-muted-foreground">{preview.total_rows} rows</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FIELDS.map((f) => (
                <div key={f}>
                  <Label>{f}</Label>
                  <Select value={mapping[f] ?? ""} onChange={(e) => setMapping({ ...mapping, [f]: e.target.value })}>
                    <option value="">— pick column —</option>
                    {preview.columns.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </Select>
                </div>
              ))}
            </div>

            <div>
              <Label>Default category (optional)</Label>
              <Select value={defaultCat} onChange={(e) => setDefaultCat(e.target.value)}>
                <option value="">— None —</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            </div>

            <div>
              <Label>Preview (first rows)</Label>
              <div className="mt-1 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-left py-1 pr-3">Date</th>
                      <th className="text-left py-1 pr-3">Amount</th>
                      <th className="text-left py-1 pr-3">Type</th>
                      <th className="text-left py-1 pr-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample_rows.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1 pr-3">{r.date ?? "—"}</td>
                        <td className="py-1 pr-3 tabular-nums">{r.amount ?? "—"}</td>
                        <td className="py-1 pr-3">{r.type ?? "—"}</td>
                        <td className="py-1 pr-3 truncate max-w-[240px]">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {err && <p className="text-sm text-destructive-foreground">{err}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setPreview(null); setMapping({}); }}>Cancel</Button>
              <Button onClick={confirm} disabled={loading}>{loading ? "Importing…" : `Import ${preview.total_rows} rows`}</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent imports</CardTitle></CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm py-1">
                  <div className="min-w-0">
                    <p className="truncate">{h.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(h.created_at)} · {h.rows_imported} imported, {h.rows_skipped} skipped
                    </p>
                  </div>
                  <span className={`text-xs uppercase ${h.status === "completed" ? "text-primary" : "text-muted-foreground"}`}>
                    {h.status}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
