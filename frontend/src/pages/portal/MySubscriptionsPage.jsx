import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCcw, Pause, XCircle, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatINR, formatDate } from '@/utils/format';
import {
  getPortalSubscriptions, pausePortalSubscription, cancelPortalSubscription,
} from '@/api/portal';

export default function MySubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPortalSubscriptions();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      toast.error('Failed to load your subscriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  async function handlePause(sub) {
    if (!sub.plan?.pausable) {
      toast.error('Your current plan does not support pausing.');
      return;
    }
    setActionLoading(sub.id);
    try {
      await pausePortalSubscription(sub.id);
      toast.success(`Subscription ${sub.number} paused`);
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to pause:', err);
      toast.error(err.response?.data?.detail || 'Failed to pause subscription');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelConfirm() {
    if (!cancelTarget) return;
    setActionLoading(cancelTarget.id);
    try {
      await cancelPortalSubscription(cancelTarget.id);
      toast.success(`Subscription ${cancelTarget.number} cancelled`);
      setCancelTarget(null);
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to cancel:', err);
      toast.error(err.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Subscriptions</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your cloud services, recurring plans, and billing cycles
        </p>
      </div>

      {/* Subscription Cards List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-3">
              <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
            </Card>
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <RefreshCcw size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-600">No active subscriptions found</p>
          <p className="text-xs text-gray-400 mt-1">Contact your account manager to activate services.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const isPausable = sub.plan?.pausable && sub.status === 'active';
            const isClosable = sub.plan?.closable && sub.status !== 'closed';

            return (
              <Card key={sub.id} className="p-6 transition-shadow hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-gray-900 text-base">{sub.plan?.name}</h3>
                      <span className={clsx(
                        'text-xs font-bold uppercase px-2 py-0.5 rounded-full',
                        sub.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : sub.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600'
                      )}>
                        {sub.status}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-blue-600 font-semibold mt-0.5">{sub.number}</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-lg font-bold text-gray-900 block">
                      {formatINR(sub.total_amount)}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      per {sub.plan?.billing_period}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Start Date</span>
                    <span className="font-medium text-gray-800">{formatDate(sub.start_date)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Next Renewal</span>
                    <span className="font-medium text-gray-800">{formatDate(sub.next_billing_date)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Plan Terms</span>
                    <span className="font-medium text-gray-800">
                      {sub.plan?.closable ? 'Flexible' : 'Committed'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Portal User */}
                <div className="flex justify-end gap-2.5 pt-4 mt-4 border-t border-gray-100">
                  {isPausable && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handlePause(sub)}
                      loading={actionLoading === sub.id}
                      className="text-xs"
                    >
                      <Pause size={13} /> Pause Subscription
                    </Button>
                  )}

                  {isClosable && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCancelTarget(sub)}
                      disabled={actionLoading === sub.id}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                    >
                      <XCircle size={13} /> Cancel
                    </Button>
                  )}

                  {!isPausable && !isClosable && sub.status === 'active' && (
                    <span className="text-xs text-gray-400 italic">
                      Fixed plan commitments apply. Contact support for changes.
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setCancelTarget(null)} />
          <Card className="relative z-10 w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Cancel Subscription?</h3>
            <p className="text-xs text-gray-500 mb-5">
              Are you sure you want to cancel <span className="font-semibold text-gray-700">{cancelTarget.plan?.name}</span>? Access will expire at the end of the current billing cycle.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setCancelTarget(null)}>
                Keep Active
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelConfirm}
                loading={actionLoading === cancelTarget.id}
              >
                Confirm Cancellation
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
