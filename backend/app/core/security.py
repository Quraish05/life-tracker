import bcrypt


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode(), hashed_password.encode())
