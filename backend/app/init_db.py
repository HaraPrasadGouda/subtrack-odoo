from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.core.security import get_password_hash
from backend.app.models.user import User, UserRole


def init_db(db: Session) -> None:
    # Create tables
    Base.metadata.create_all(bind=engine)

    # Seed admin if not present
    admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL.lower()).first()
    if not admin:
        admin_user = User(
            name=settings.ADMIN_NAME,
            email=settings.ADMIN_EMAIL.lower(),
            password_hash=get_password_hash(settings.ADMIN_PASSWORD),
            role=UserRole.ADMIN.value,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"[INIT_DB] Seed admin created: {admin_user.email} (Role: {admin_user.role})")
    else:
        print(f"[INIT_DB] Seed admin already exists: {admin.email}")


def setup_database():
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()


if __name__ == "__main__":
    setup_database()
