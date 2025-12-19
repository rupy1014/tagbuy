"""Payment and Escrow models"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PaymentMethod(str):
    """Payment method types"""
    CARD = "card"
    VBANK = "vbank"  # Virtual account
    BANK = "bank"    # Direct bank transfer
    PHONE = "phone"  # Phone billing
    KAKAO = "kakao"
    NAVER = "naver"
    TOSS = "toss"


class EscrowStatus(str):
    """Escrow transaction status"""
    PENDING = "pending"              # Payment initiated but not confirmed
    DEPOSITED = "deposited"          # Payment confirmed, funds in escrow
    PARTIALLY_RELEASED = "partially_released"  # Some funds released
    RELEASED = "released"            # All funds released to influencers
    REFUNDED = "refunded"            # Refunded to advertiser
    CANCELLED = "cancelled"          # Payment cancelled


class WithdrawalStatus(str):
    """Withdrawal request status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Payment(Base):
    """Payment record from Bootpay"""
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Bootpay info
    receipt_id = Column(String(100), unique=True, nullable=False, index=True)
    order_id = Column(String(100), nullable=False, index=True)

    # Payment details
    method = Column(String(50))  # card, vbank, bank, phone, etc.
    method_name = Column(String(100))  # Display name like "신한카드"
    pg = Column(String(50))  # PG provider (inicis, kcp, etc.)

    # Amount
    price = Column(Numeric(12, 2), nullable=False)
    tax_free = Column(Numeric(12, 2), default=0)

    # Status (Bootpay status codes)
    # 0: 결제 대기, 1: 결제 완료, 2: 결제 승인 중
    # 20: 결제 취소, 21: 결제 취소 승인 중
    status = Column(String(10), nullable=False)
    status_locale = Column(String(50))  # Human readable status

    # Metadata
    purchased_at = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))
    cancel_reason = Column(Text)

    # Relations
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)

    # Relationships
    campaign = relationship("Campaign", backref="payments")
    user = relationship("User", backref="payments")
    escrow_transaction = relationship(
        "EscrowTransaction",
        back_populates="payment",
        uselist=False
    )

    def __repr__(self) -> str:
        return f"<Payment {self.receipt_id}>"


class EscrowTransaction(Base):
    """Escrow transaction for campaign budget"""
    __tablename__ = "escrow_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Payment reference
    payment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payments.id"),
        unique=True,
        nullable=False,
    )
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id"),
        nullable=False,
        index=True,
    )

    # Amounts
    total_amount = Column(Numeric(12, 2), nullable=False)  # Total deposited
    escrow_fee = Column(Numeric(10, 2), nullable=False)    # 0.5% fee
    pg_fee = Column(Numeric(10, 2), nullable=False)        # PG fee
    net_amount = Column(Numeric(12, 2), nullable=False)    # Amount for influencers
    released_amount = Column(Numeric(12, 2), default=0)    # Amount released so far
    remaining_amount = Column(Numeric(12, 2))              # Remaining in escrow

    # Status
    status = Column(
        SQLEnum(
            "pending", "deposited", "partially_released",
            "released", "refunded", "cancelled",
            name="escrow_status_enum"
        ),
        default="pending",
        nullable=False,
    )

    # Timestamps
    deposited_at = Column(DateTime(timezone=True))
    released_at = Column(DateTime(timezone=True))
    refunded_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)

    # Relationships
    payment = relationship("Payment", back_populates="escrow_transaction")
    campaign = relationship("Campaign", backref="escrow_transactions")
    releases = relationship("EscrowRelease", back_populates="escrow_transaction")

    def __repr__(self) -> str:
        return f"<EscrowTransaction {self.id}>"


class EscrowRelease(Base):
    """Individual release from escrow to influencer"""
    __tablename__ = "escrow_releases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    escrow_transaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("escrow_transactions.id"),
        nullable=False,
        index=True,
    )
    influencer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("influencers.id"),
        nullable=False,
        index=True,
    )
    campaign_influencer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaign_influencers.id"),
        nullable=False,
    )

    # Amount
    amount = Column(Numeric(12, 2), nullable=False)
    pg_fee_deducted = Column(Numeric(10, 2), default=0)  # If influencer pays PG fee
    net_amount = Column(Numeric(12, 2), nullable=False)  # Actual amount to influencer

    # Status
    status = Column(
        SQLEnum("pending", "completed", "failed", name="release_status_enum"),
        default="pending",
        nullable=False,
    )

    # Reason
    reason = Column(String(100))  # e.g., "content_approved", "campaign_completed"

    # Timestamps
    released_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    escrow_transaction = relationship("EscrowTransaction", back_populates="releases")
    influencer = relationship("Influencer", backref="escrow_releases")

    def __repr__(self) -> str:
        return f"<EscrowRelease {self.id}>"


class InfluencerBalance(Base):
    """Influencer's available balance for withdrawal"""
    __tablename__ = "influencer_balances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    influencer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("influencers.id"),
        unique=True,
        nullable=False,
    )

    # Balance
    available_balance = Column(Numeric(12, 2), default=0)  # Withdrawable
    pending_balance = Column(Numeric(12, 2), default=0)    # Awaiting release
    total_earned = Column(Numeric(12, 2), default=0)       # All-time earnings
    total_withdrawn = Column(Numeric(12, 2), default=0)    # All-time withdrawals

    # Timestamps
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)

    # Relationships
    influencer = relationship("Influencer", backref="balance", uselist=False)

    def __repr__(self) -> str:
        return f"<InfluencerBalance {self.influencer_id}>"


class Withdrawal(Base):
    """Withdrawal request from influencer"""
    __tablename__ = "withdrawals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    influencer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("influencers.id"),
        nullable=False,
        index=True,
    )

    # Amount
    amount = Column(Numeric(12, 2), nullable=False)
    fee = Column(Numeric(10, 2), default=0)  # Withdrawal fee if any
    net_amount = Column(Numeric(12, 2), nullable=False)  # Actual transfer amount

    # Bank info (snapshot at withdrawal time)
    bank_code = Column(String(20), nullable=False)
    bank_name = Column(String(50), nullable=False)
    account_number = Column(String(50), nullable=False)
    account_holder = Column(String(50), nullable=False)

    # Status
    status = Column(
        SQLEnum(
            "pending", "processing", "completed", "failed", "cancelled",
            name="withdrawal_status_enum"
        ),
        default="pending",
        nullable=False,
    )
    failure_reason = Column(Text)

    # Timestamps
    requested_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    processed_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    # Relationships
    influencer = relationship("Influencer", backref="withdrawals")

    def __repr__(self) -> str:
        return f"<Withdrawal {self.id}>"
