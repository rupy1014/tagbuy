"""Payment schemas"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ==================== Payment Schemas ====================

class PaymentPrepareRequest(BaseModel):
    """Request to prepare payment"""
    campaign_id: UUID
    payment_method: Optional[str] = None  # card, vbank, etc.


class PaymentPrepareResponse(BaseModel):
    """Response with payment preparation data"""
    order_id: str
    order_name: str
    price: int  # Total price including fees
    campaign_budget: Decimal
    escrow_fee: Decimal  # 0.5%
    pg_fee_estimate: Decimal  # Estimated PG fee
    pg_fee_payer: str  # advertiser or influencer


class PaymentVerifyRequest(BaseModel):
    """Request to verify payment after Bootpay callback"""
    receipt_id: str
    order_id: str


class PaymentVerifyResponse(BaseModel):
    """Response after payment verification"""
    success: bool
    payment_id: UUID
    escrow_id: UUID
    message: str


class PaymentResponse(BaseModel):
    """Payment record response"""
    id: UUID
    receipt_id: str
    order_id: str
    method: Optional[str] = None
    method_name: Optional[str] = None
    price: Decimal
    status: str
    status_locale: Optional[str] = None
    campaign_id: UUID
    purchased_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    """Payment list response"""
    payments: List[PaymentResponse]
    total: int
    limit: int
    offset: int


class PaymentCancelRequest(BaseModel):
    """Request to cancel payment"""
    receipt_id: str
    reason: str = Field(..., min_length=1, max_length=500)
    cancel_amount: Optional[int] = None  # Partial cancel


# ==================== Escrow Schemas ====================

class EscrowResponse(BaseModel):
    """Escrow transaction response"""
    id: UUID
    campaign_id: UUID
    total_amount: Decimal
    escrow_fee: Decimal
    pg_fee: Decimal
    net_amount: Decimal
    released_amount: Decimal
    remaining_amount: Optional[Decimal] = None
    status: str
    deposited_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EscrowReleaseRequest(BaseModel):
    """Request to release escrow funds"""
    influencer_id: UUID
    amount: Decimal = Field(..., gt=0)
    reason: str = Field(default="content_approved")


class EscrowReleaseResponse(BaseModel):
    """Response after escrow release"""
    id: UUID
    influencer_id: UUID
    amount: Decimal
    net_amount: Decimal
    status: str
    released_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EscrowRefundRequest(BaseModel):
    """Request to refund escrow"""
    reason: str = Field(..., min_length=1, max_length=500)


# ==================== Balance & Settlement Schemas ====================

class BalanceResponse(BaseModel):
    """Influencer balance response"""
    available_balance: Decimal
    pending_balance: Decimal
    total_earned: Decimal
    total_withdrawn: Decimal

    class Config:
        from_attributes = True


class SettlementResponse(BaseModel):
    """Settlement record for influencer"""
    id: UUID
    campaign_id: UUID
    campaign_title: str
    amount: Decimal
    net_amount: Decimal
    status: str
    reason: str
    released_at: Optional[datetime] = None
    created_at: datetime


class SettlementListResponse(BaseModel):
    """Settlement list response"""
    settlements: List[SettlementResponse]
    total: int
    limit: int
    offset: int


# ==================== Withdrawal Schemas ====================

class BankAccountInfo(BaseModel):
    """Bank account information"""
    bank_code: str = Field(..., min_length=3, max_length=20)
    bank_name: str = Field(..., min_length=1, max_length=50)
    account_number: str = Field(..., min_length=10, max_length=50)
    account_holder: str = Field(..., min_length=1, max_length=50)


class WithdrawalRequest(BaseModel):
    """Request to withdraw funds"""
    amount: Decimal = Field(..., gt=0)
    bank_account: Optional[BankAccountInfo] = None  # Use saved if not provided


class WithdrawalResponse(BaseModel):
    """Withdrawal response"""
    id: UUID
    amount: Decimal
    fee: Decimal
    net_amount: Decimal
    bank_name: str
    account_number: str  # Masked
    status: str
    requested_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WithdrawalListResponse(BaseModel):
    """Withdrawal list response"""
    withdrawals: List[WithdrawalResponse]
    total: int
    limit: int
    offset: int


# ==================== Webhook Schemas ====================

class BootpayWebhookPayload(BaseModel):
    """Bootpay webhook payload"""
    receipt_id: str
    order_id: str
    price: int
    tax_free: Optional[int] = 0
    status: int  # 1: 완료, 20: 취소
    method: Optional[str] = None
    method_name: Optional[str] = None
    pg: Optional[str] = None
    purchased_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    cancel_reason: Optional[str] = None
