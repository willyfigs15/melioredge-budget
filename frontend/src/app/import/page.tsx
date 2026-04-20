"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ImportRow, ImportTemplateValidateResponse } from "@/types";

export default function ImportPage() {
  const [validation, setValidation] = useState<ImportTemplateValidateResponse | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileB64, setFileB64] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    const { data } = await api.get<ImportRow[]>("/api/imports");
    setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/api/imports/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "melioredge-budget-template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download template.");
    }
  };

  const onFile = async (file: File) => {
    setErr(null);
    setValidation(null);
    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    const b64: string = await new Promise((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setFileB64(b64);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post<ImportTemplateValidateResponse>("/api/imports/template/validate", fd);
      setValidation(data);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Could not read CSV.");
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!validation || !fileName || !fileB64) return;
    if (validation.errors.length > 0) {
      toast.error("Fix the errors below before importing.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await api.post<ImportRow>("/api/imports/template/confirm", {
        filename: fileName,
        content_b64: fileB64,
      });
      toast.success(`Imported ${validation.valid_rows} rows`);
      reset();
      loadHistory();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setValidation(null);
    setFileName(null);
    setFileB64(null);
    setErr(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const hasErrors = (validation?.errors?.length ?? 0) > 0;
  const canImport = validation && validation.valid_rows > 0 && !hasErrors;

  return (
    <div className="py-6 space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Import transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download the template, fill it out, and upload it back. We'll validate every row before importing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1 · Download the template</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-sm text-muted-foreground">
            Required columns: <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">date, amount, description, type, category</code>.
            Dates in <code className="text-xs">YYYY-MM-DD</code>. Type is <code className="text-xs">income</code> or <code className="text-xs">expense</code>.
            Category is optional but must match an existing category name.
          </div>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download template
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Upload your filled CSV</CardTitle>
        </CardHeader>
        <CardBody>
          {!validation && !loading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Upload className="h-8 w-8 text-primary mb-3" />
              <p className="font-medium">Drop your CSV here</p>
              <p className="text-sm text-muted-foreground mb-4">Max 10 MB.</p>
              <label className="inline-flex">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                />
                <span className="inline-flex items-center justify-center h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90">
                  Choose file
                </span>
              </label>
            </div>
          )}

          {loading && <p className="text-sm text-muted-foreground py-4 text-center">Parsing…</p>}

          {validation && !loading && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{validation.filename}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasErrors ? (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive-foreground">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {validation.errors.length} error{validation.errors.length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {validation.valid_rows} row{validation.valid_rows === 1 ? "" : "s"} ready
                    </span>
                  )}
                </div>
              </div>

              {hasErrors && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
                  <p className="text-sm font-medium text-destructive-foreground mb-2">
                    Fix these {validation.errors.length} issue{validation.errors.length === 1 ? "" : "s"} and re-upload:
                  </p>
                  <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
                    {validation.errors.slice(0, 100).map((e, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">Row {e.row}</span>
                        <span className="text-muted-foreground shrink-0">·</span>
                        <span className="font-mono text-xs shrink-0 text-muted-foreground">{e.field}</span>
                        <span className="text-muted-foreground shrink-0">—</span>
                        <span>{e.message}</span>
                      </li>
                    ))}
                    {validation.errors.length > 100 && (
                      <li className="text-xs text-muted-foreground pt-1">…and {validation.errors.length - 100} more</li>
                    )}
                  </ul>
                </div>
              )}

              {validation.sample.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Preview (first {validation.sample.length} valid rows)</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="text-muted-foreground border-b border-border">
                        <tr>
                          <th className="text-left py-1.5 pr-3">Date</th>
                          <th className="text-left py-1.5 pr-3">Description</th>
                          <th className="text-left py-1.5 pr-3">Type</th>
                          <th className="text-left py-1.5 pr-3">Category</th>
                          <th className="text-right py-1.5">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validation.sample.map((r, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="py-1.5 pr-3 tabular-nums">{r.date}</td>
                            <td className="py-1.5 pr-3 truncate max-w-[200px]">{r.description}</td>
                            <td className="py-1.5 pr-3">
                              <span className={r.type === "income" ? "text-primary" : "text-destructive-foreground"}>
                                {r.type}
                              </span>
                            </td>
                            <td className="py-1.5 pr-3 text-muted-foreground">{r.category_name ?? "—"}</td>
                            <td className="py-1.5 tabular-nums text-right">{formatCurrency(r.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {err && <p className="text-sm text-destructive-foreground">{err}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={reset}>Cancel</Button>
                <Button onClick={confirmImport} disabled={!canImport || loading}>
                  {loading ? "Importing…" : `Import ${validation.valid_rows} row${validation.valid_rows === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

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
