from datetime import datetime, timedelta, timezone
import secrets
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.security import (
    validate_password_strength,
    get_password_hash,
    verify_password,
    create_access_token,
)
from backend.app.models.user import User, UserRole
from backend.app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserOut,
    MessageResponse,
)


class AuthService:
    @staticmethod
    def signup(db: Session, request: SignupRequest) -> UserOut:
        # Validate password strength (>8 chars + uppercase + lowercase + special char)
        validate_password_strength(request.password)

        normalized_email = request.email.lower().strip()
        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered.",
            )

        new_user = User(
            name=request.name.strip(),
            email=normalized_email,
            password_hash=get_password_hash(request.password),
            role=UserRole.PORTAL.value,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return UserOut.model_validate(new_user)

    @staticmethod
    def login(db: Session, request: LoginRequest) -> TokenResponse:
        normalized_email = request.email.lower().strip()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name,
        }
        access_token = create_access_token(data=token_payload)
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserOut.model_validate(user),
        )

    @staticmethod
    def forgot_password(db: Session, request: ForgotPasswordRequest) -> MessageResponse:
        normalized_email = request.email.lower().strip()
        user = db.query(User).filter(User.email == normalized_email).first()
        if user:
            reset_token = secrets.token_urlsafe(32)
            user.reset_token = reset_token
            # Expire in 1 hour
            user.reset_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
            db.commit()

            # Print reset link in console for demo as required by hackathon spec
            reset_url = f"http://localhost:5173/reset-password?token={reset_token}"
            print(f"\n=======================================================", flush=True)
            print(f"[DEMO RESET LINK] User: {user.email}", flush=True)
            print(f"URL: {reset_url}", flush=True)
            print(f"Token: {reset_token}", flush=True)
            print(f"=======================================================\n", flush=True)

        return MessageResponse(
            message="If your email is registered, password reset instructions have been generated."
        )

    @staticmethod
    def reset_password(db: Session, request: ResetPasswordRequest) -> MessageResponse:
        user = db.query(User).filter(User.reset_token == request.token).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token.",
            )

        now = datetime.now(timezone.utc)
        # Handle SQLite naive datetime vs timezone-aware
        expiry = user.reset_expiry
        if expiry:
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if expiry < now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reset token has expired.",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token.",
            )

        # Validate password strength (>8 chars + uppercase + lowercase + special char)
        validate_password_strength(request.new_password)

        user.password_hash = get_password_hash(request.new_password)
        user.reset_token = None
        user.reset_expiry = None
        db.commit()

        return MessageResponse(message="Password has been reset successfully.")

