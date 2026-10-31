import { LayoutDashboard } from 'lucide-react';
import PlaceholderPage from '@/components/ui/PlaceholderPage';

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="KPI cards, MRR/ARR, revenue chart, subscription donut and overdue invoices table — coming in Page 3."
      icon={LayoutDashboard}
    />
  );
}

