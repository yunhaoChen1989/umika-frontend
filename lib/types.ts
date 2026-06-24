export type MenuCategory = "Nigiri" | "Rolls" | "Combos" | "Sashimi" | "Drinks";

export type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  price: number;
  popular?: boolean;
  tags: string[];
};

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type RewardTransaction = {
  id: string;
  label: string;
  points: number;
  type: "ORDER" | "REFERRAL" | "REDEEM" | "BIRTHDAY";
  date: string;
};
