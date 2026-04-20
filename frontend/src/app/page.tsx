"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Sparkles, TrendingUp } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MonthSelector } from "@/components/MonthSelector";
import type { DashboardSummary } from "@/types";

function currentPeriod() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function HomePage() {
  const [{ year, month }, setPeriod] = useState(currentPeriod);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(null);
    api.get<DashboardSummary>("/api/dashboard/summary", { params: { year, month } })
      .then((r) => setSummary(r.data))
      .catch(() => setError("Could not load your monthly summary."));
  }, [year, month]);

  const spentCats = (summary?.categories ?? []).filter((c) => parseFloat(c.spent) > 0);

  return (
    <div className="py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overview</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Your money this month</h1>
        </div>
        <MonthSelector year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
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

          {parseFloat(summary.projected_income) > 0 && (
            <Card>
              <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Projected income</p>
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(summary.projected_income)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actual so far</p>
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(summary.total_income)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">vs Projected</p>
                    <p className={`text-sm font-semibold tabular-nums ${parseFloat(summary.projected_vs_actual) >= 0 ? "text-primary" : "text-destructive-foreground"}`}>
                      {parseFloat(summary.projected_vs_actual) >= 0 ? "+" : ""}
                      {formatCurrency(summary.projected_vs_actual)}
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-w-[160px] max-w-xs">
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, parseFloat(summary.projected_income) > 0
                          ? (parseFloat(summary.total_income) / parseFloat(summary.projected_income)) * 100
                          : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

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

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
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

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Spending breakdown</CardTitle></CardHeader>
              <CardBody>
                {spentCats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses logged yet this month.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={spentCats.map((c) => ({
                            name: c.name,
                            value: parseFloat(c.spent),
                            color: c.color,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          strokeWidth={2}
                          stroke="hsl(var(--background))"
                        >
                          {spentCats.map((c, i) => (
                            <Cell key={i} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                          formatter={(v: number) => formatCurrency(v)}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/transactions" className="block">
              <Card className="hover:bg-secondary/30 transition h-full">
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
              <Card className="hover:bg-secondary/30 transition h-full">
                <CardBody className="flex items-center gap-3">
                  <ArrowUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Import bank CSV</p>
                    <p className="text-sm text-muted-foreground">Bulk-load your statement.</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/recurring" className="block">
              <Card className="hover:bg-secondary/30 transition h-full">
                <CardBody className="flex items-center gap-3">
                  <ArrowDown className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Recurring transactions</p>
                    <p className="text-sm text-muted-foreground">Rent, paycheck, subscriptions.</p>
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
