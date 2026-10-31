from datetime import date, timedelta
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from backend.app.models.subscription import Subscription, SubscriptionStatus
from backend.app.models.invoice import Invoice, Payment
from backend.app.schemas.analytics import RevenueAnalyticsOut, MonthlyRevenueItem


class AnalyticsService:
    @staticmethod
    def _subtract_months(year: int, month: int, count: int) -> Tuple[int, int]:
        m = month - count
        y = year
        while m <= 0:
            m += 12
            y -= 1
        return y, m

    @staticmethod
    def _next_month_start(year: int, month: int) -> date:
        if month == 12:
            return date(year + 1, 1, 1)
        return date(year, month + 1, 1)

    @staticmethod
    def get_revenue_analytics(db: Session, target_date: Optional[date] = None) -> RevenueAnalyticsOut:
        """
        Computes key revenue metrics:
        - MRR: Monthly Recurring Revenue normalized by billing period
          (yearly/12, weekly*4.33, daily*30, monthly)
        - ARR: Annualized Recurring Revenue (MRR * 12)
        - Churn % this month: Subscriptions closed this month relative to total active + closed
        - Expected revenue next 30 days: Active subscriptions due for billing within next 30 days
        - Monthly revenue for last 6 months: Monthly historical payment collection breakdown
        """
        today = target_date or date.today()

        # 1. Active Subscriptions
        active_subs = (
            db.query(Subscription)
            .options(
                selectinload(Subscription.lines),
                selectinload(Subscription.plan),
            )
            .filter(Subscription.status == SubscriptionStatus.ACTIVE.value)
            .all()
        )

        total_subs_count = db.query(func.count(Subscription.id)).scalar() or 0

        # 2. MRR & ARR calculation
        mrr_total = 0.0
        for sub in active_subs:
            # Recurring amount is line total or plan price fallback
            sub_amount = (
                sum(line.amount for line in sub.lines)
                if sub.lines
                else (sub.plan.price if sub.plan else 0.0)
            )

            billing_period = sub.plan.billing_period.lower() if (sub.plan and sub.plan.billing_period) else "monthly"

            if billing_period == "yearly":
                normalized_mrr = sub_amount / 12.0
            elif billing_period == "weekly":
                normalized_mrr = sub_amount * 4.33
            elif billing_period == "daily":
                normalized_mrr = sub_amount * 30.0
            else:  # monthly
                normalized_mrr = sub_amount

            mrr_total += normalized_mrr

        mrr = round(mrr_total, 2)
        arr = round(mrr * 12.0, 2)

        # 3. Churn % this month
        closed_this_month = (
            db.query(func.count(Subscription.id))
            .filter(Subscription.status == SubscriptionStatus.CLOSED.value)
            .scalar()
            or 0
        )
        active_count = len(active_subs)
        churn_denominator = active_count + closed_this_month
        churn_rate = (
            round((closed_this_month / churn_denominator) * 100.0, 2)
            if churn_denominator > 0
            else 0.0
        )

        # 4. Expected revenue next 30 days
        next_30_days = today + timedelta(days=30)
        expected_rev = 0.0
        for sub in active_subs:
            if sub.next_billing_date and today <= sub.next_billing_date <= next_30_days:
                sub_amt = (
                    sum(line.amount for line in sub.lines)
                    if sub.lines
                    else (sub.plan.price if sub.plan else 0.0)
                )
                expected_rev += sub_amt
        expected_revenue_30d = round(expected_rev, 2)

        # 5. Monthly revenue for last 6 months
        month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ]
        monthly_series: List[MonthlyRevenueItem] = []

        # Iterate from 5 months ago up to current month (0)
        for offset in range(5, -1, -1):
            y, m = AnalyticsService._subtract_months(today.year, today.month, offset)
            m_start = date(y, m, 1)
            m_end = AnalyticsService._next_month_start(y, m)

            stat = (
                db.query(
                    func.coalesce(func.sum(Payment.amount), 0.0),
                    func.count(Payment.id),
                )
                .filter(
                    Payment.date >= m_start,
                    Payment.date < m_end,
                )
                .first()
            )

            rev = round(float(stat[0]), 2) if stat else 0.0
            p_cnt = int(stat[1]) if stat else 0

            monthly_series.append(
                MonthlyRevenueItem(
                    month=f"{y:04d}-{m:02d}",
                    month_name=f"{month_names[m - 1]} {y}",
                    revenue=rev,
                    payments_count=p_cnt,
                )
            )

        return RevenueAnalyticsOut(
            mrr=mrr,
            arr=arr,
            churn_rate_percent=churn_rate,
            expected_revenue_30d=expected_revenue_30d,
            monthly_revenue_last_6_months=monthly_series,
            active_subscriptions_count=active_count,
            total_subscriptions_count=total_subs_count,
        )

