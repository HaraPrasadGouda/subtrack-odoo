import enum
from sqlalchemy import Column, Integer, String, Float
from backend.app.core.database import Base


class TaxType(str, enum.Enum):
    GST = "gst"
    OTHER = "other"


class Tax(Base):
    """
    Table: taxes (id, name, rate_percent, type gst/other)
    """
    __tablename__ = "taxes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    rate_percent = Column(Float, nullable=False, default=0.0)
    type = Column(String(50), nullable=False, default=TaxType.GST.value)
