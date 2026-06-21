import {
  Activity,
  ClipboardCheck,
  PieChart,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

import Card from './Card';
import Badge from './Badge';

const iconMap = {
  Users,
  Wallet,
  ClipboardCheck,
  ShieldCheck,
  Receipt,
  PieChart,
  Activity,
};

interface StatItem {
  id: string;
  label: string;
  value: string;
  icon: string;
  trend: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
}

interface StatProps {
  item: StatItem;
}

const Stat = ({ item }: StatProps) => {
  const Icon = iconMap[item.icon as keyof typeof iconMap] || Activity;

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{item.label}</p>
          <p className="mt-3 text-3xl font-bold text-brand-navy">{item.value}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={item.trend.direction === 'up' ? 'success' : 'warning'}>
              {item.trend.direction === 'up' ? '+' : '-'}
              {Math.abs(item.trend.value)}%
            </Badge>
            <span className="text-xs text-slate-500">{item.trend.label}</span>
          </div>
        </div>
        <span className="rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </Card>
  );
};

export default Stat;
