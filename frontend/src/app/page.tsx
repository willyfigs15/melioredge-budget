"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Sparkles, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, monthLabel } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { DashboardSummary } from "@/types";

function currentPeriod() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function HomePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { year, month } = currentPeriod();

  useEffect(() => {
    api.get<DashboardSummary>("/api/dashboard/summary", { params: { year, month } })
      .then((r) => setSummary(r.data))
      .catch(() => setError("Could not load your monthly summary."));
  }, [year, month]);

  return (
    <div className="py-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{monthLabel(year, month)}</p>
        <h1 className="text-2xl md:text-3xl font-semibold mt-1">Your money this month</h1>
      </div>

      {error && <p className="text-sm text-destructive-foreground">{error}</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Income" value={summary.total_income} tone="up" />
            <StatCard label="Expense" value={summary.total_expense} tone="down" />
            <StatCard label="Balance" value={summary.balance} tone={parseFloat(summary.balance) >= 0 ? "up" : "down"} />
            <StatCard label="Health" value={`${summary.health_score}/100`} tone="neutral" />
          </div>

          {summary.ready_to_invest && (
            <Card className="border-primary/40 bg-primary/10">
              <CardBody className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">You're ready to start investing.</p>
                  <p className="text-sm text-muted-foreground">
                    Savings rate is healthy and you're on budget this month.
                  </p>
                </div>
                <Button size="sm" variant="secondary" className="hidden sm:inline-flex">
                  Open Journal
                </Button>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Budget vs Actual</CardTitle>
              <Link href="/budgets" className="text-xs text-primary">Manage</Link>
            </CardHeader>
            <CardBody>
              {summary.categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No budget set for this month.{" "}
                  <Link href="/budgets" className="text-primary underline">Create one →</Link>
                </p>
              ) : (
                <ul className="space-y-4">
                  {summary.categories.map((c) => (
                    <li key={c.category_id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatCurrency(c.spent)} / {formatCurrency(c.limit_amount)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.min(100, c.percent_used)}%`,
                            background: c.percent_used > 100 ? "hsl(var(--destructive))" : c.color,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/transactions" className="block">
              <Card className="hover:bg-secondary/30 transition">
                <CardBody className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Log a transaction</p>
                    <p className="text-sm text-muted-foreground">Track income or expenses by hand.</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/import" className="block">
              <Card className="hover:bg-secondary/30 transition">
                <CardBody className="flex items-center gap-3">
                  <ArrowUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Import bank CSV</p>
                    <p className="text-sm text-muted-foreground">Bulk-load your statement.</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "up" | "down" | "neutral" }) {
  const Icon = tone === "up" ? ArrowUp : tone === "down" ? ArrowDown : null;
  const color =
    tone === "up" ? "text-primary" : tone === "down" ? "text-destructive-foreground" : "text-foreground";
  return (
    <Card>
      <CardBody className="py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-lg font-semibold tabular-nums flex items-center gap-1 ${color}`}>
          {Icon && <Icon className="h-4 w-4" />}
          {typeof value === "string" && value.includes("/") ? value : formatCurrency(value)}
        </p>
      </CardBody>
    </Card>
  );
}
