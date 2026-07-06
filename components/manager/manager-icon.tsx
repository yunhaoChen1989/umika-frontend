import {
  BadgeAlert,
  BadgePercent,
  Bell,
  ClipboardList,
  Clock3,
  CreditCard,
  FileSearch,
  Folders,
  LayoutDashboard,
  LucideIcon,
  MailPlus,
  MenuSquare,
  Settings,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  SquareLibrary,
  Store,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  BadgeAlert,
  BadgePercent,
  Bell,
  ClipboardList,
  Clock3,
  CreditCard,
  FileSearch,
  Folders,
  LayoutDashboard,
  MailPlus,
  MenuSquare,
  Settings,
  ShieldCheck,
  ShieldUser: ShieldPlus,
  Sparkles,
  SquareLibrary,
  Store,
  UserRound,
  Users,
  Utensils,
};

export function ManagerIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? LayoutDashboard;

  return <Icon className={className} aria-hidden="true" />;
}
