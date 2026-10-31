import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getDashboardSummary, getAnalytics } from '@/api/dashboard';
import KPICards, { MRRARRCards } from '@/components/dashboard/KPICards';
import RevenueChart from '@/components/dashboard/RevenueChart';
import SubscriptionDonut from '@/components/dashboard/SubscriptionDonut';
import OverdueTable from '@/components/dashboard/OverdueTable';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last_6');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, analyticsData] = await Promise.all([
        getDashboardSummary({ range: dateRange }),
        getAnalytics({ range: dateRange }),
      ]);
      setSummary(summaryData);
      setAnalytics(analyticsData);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header + date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">Real-time metrics for your subscription business</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <KPICards summary={summary} loading={loading} />

      {/* MRR / ARR */}
      <MRRARRCards summary={summary} loading={loading} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={analytics?.revenue_chart} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <SubscriptionDonut data={analytics?.subscription_status} loading={loading} />
        </div>
      </div>

      {/* Overdue invoices table */}
      <OverdueTable invoices={analytics?.overdue_invoices} loading={loading} />
    </div>
  );
}
