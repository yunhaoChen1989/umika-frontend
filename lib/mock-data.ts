import type { MenuItem, OrderStatus, RewardTransaction } from "@/lib/types";

export const menuItems: MenuItem[] = [
  {
    id: "umika-omakase",
    name: "Umika Omakase Box",
    category: "Combos",
    description: "Chef selection of nigiri, sashimi, maki, and seasonal garnish.",
    price: 38,
    popular: true,
    tags: ["Chef pick", "Dinner"],
  },
  {
    id: "salmon-nigiri",
    name: "Atlantic Salmon Nigiri",
    category: "Nigiri",
    description: "Two pieces with seasoned rice, wasabi, and house soy.",
    price: 7,
    popular: true,
    tags: ["Fresh", "Classic"],
  },
  {
    id: "spicy-tuna",
    name: "Spicy Tuna Roll",
    category: "Rolls",
    description: "Tuna, cucumber, scallion, sesame, and chili mayo.",
    price: 12,
    popular: true,
    tags: ["Spicy"],
  },
  {
    id: "dragon-roll",
    name: "Dragon Roll",
    category: "Rolls",
    description: "Tempura shrimp, avocado, unagi sauce, and tobiko.",
    price: 16,
    tags: ["Signature"],
  },
  {
    id: "sashimi-trio",
    name: "Sashimi Trio",
    category: "Sashimi",
    description: "Nine slices of salmon, tuna, and hamachi.",
    price: 24,
    tags: ["Protein"],
  },
  {
    id: "matcha-soda",
    name: "Yuzu Matcha Soda",
    category: "Drinks",
    description: "Sparkling yuzu, chilled matcha, and citrus peel.",
    price: 6,
    tags: ["House drink"],
  },
];

export const orderQueue: Array<{
  id: string;
  customer: string;
  total: number;
  status: OrderStatus;
  promisedAt: string;
}> = [
  { id: "U-1048", customer: "Mei Lin", total: 54.5, status: "PREPARING", promisedAt: "6:35 PM" },
  { id: "U-1049", customer: "Alex Wong", total: 28, status: "PAID", promisedAt: "6:45 PM" },
  { id: "U-1050", customer: "Priya Shah", total: 72.25, status: "READY", promisedAt: "6:50 PM" },
];

export const rewardTransactions: RewardTransaction[] = [
  { id: "rtx-1", label: "Order U-1029", points: 48, type: "ORDER", date: "Today" },
  { id: "rtx-2", label: "Friend first order", points: 100, type: "REFERRAL", date: "Jun 18" },
  { id: "rtx-3", label: "$10 reward redeemed", points: -200, type: "REDEEM", date: "Jun 10" },
  { id: "rtx-4", label: "Birthday bonus", points: 100, type: "BIRTHDAY", date: "May 04" },
];

export const stats = [
  { label: "Today's sales", value: "$1,842" },
  { label: "Open orders", value: "14" },
  { label: "New customers", value: "9" },
  { label: "Points issued", value: "3,280" },
];
