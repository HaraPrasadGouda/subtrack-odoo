from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.plan import RecurringPlan, BillingPeriod
from backend.app.schemas.plan import PlanCreate, PlanUpdate, PlanOut


class PlanService:
    @staticmethod
    def get_plans(db: Session, skip: int = 0, limit: int = 100) -> List[PlanOut]:
        plans = db.query(RecurringPlan).offset(skip).limit(limit).all()
        return [PlanOut.model_validate(p) for p in plans]

    @staticmethod
    def get_plan_by_id(db: Session, plan_id: int) -> RecurringPlan:
        plan = db.query(RecurringPlan).filter(RecurringPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan with ID {plan_id} not found")
        return plan

    @staticmethod
    def create_plan(db: Session, data: PlanCreate) -> PlanOut:
        # Validate billing_period
        valid_periods = [p.value for p in BillingPeriod]
        if data.billing_period not in valid_periods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid billing period '{data.billing_period}'. Allowed values: {', '.join(valid_periods)}",
            )
        plan = RecurringPlan(**data.model_dump())
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return PlanOut.model_validate(plan)

    @staticmethod
    def update_plan(db: Session, plan_id: int, data: PlanUpdate) -> PlanOut:
        plan = PlanService.get_plan_by_id(db, plan_id)
        update_data = data.model_dump(exclude_unset=True)
        if "billing_period" in update_data:
            valid_periods = [p.value for p in BillingPeriod]
            if update_data["billing_period"] not in valid_periods:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid billing period '{update_data['billing_period']}'. Allowed values: {', '.join(valid_periods)}",
                )
        for key, value in update_data.items():
            setattr(plan, key, value)
        db.commit()
        db.refresh(plan)
        return PlanOut.model_validate(plan)

    @staticmethod
    def delete_plan(db: Session, plan_id: int) -> dict:
        plan = PlanService.get_plan_by_id(db, plan_id)
        db.delete(plan)
        db.commit()
        return {"message": f"Plan {plan_id} deleted successfully"}
