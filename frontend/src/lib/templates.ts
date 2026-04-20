export type CategoryTemplate = {
  name: string;
  limit_amount: string;
  color: string;
  icon: string;
};

export const STARTER_CATEGORIES: CategoryTemplate[] = [
  { name: "Housing",        limit_amount: "1200", color: "#3b82f6", icon: "Home" },
  { name: "Food",           limit_amount: "500",  color: "#22c55e", icon: "UtensilsCrossed" },
  { name: "Transport",      limit_amount: "200",  color: "#f59e0b", icon: "Car" },
  { name: "Utilities",      limit_amount: "150",  color: "#14b8a6", icon: "Zap" },
  { name: "Entertainment",  limit_amount: "100",  color: "#a855f7", icon: "Music" },
  { name: "Shopping",       limit_amount: "150",  color: "#ec4899", icon: "ShoppingBag" },
  { name: "Health",         limit_amount: "100",  color: "#ef4444", icon: "Heart" },
  { name: "Savings",        limit_amount: "300",  color: "#eab308", icon: "PiggyBank" },
];
