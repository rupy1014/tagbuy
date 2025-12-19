"""Payment service for Bootpay integration and escrow management"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import TagBuyException
from app.models.campaign import Campaign
from app.models.payment import (
    Payment,
    EscrowTransaction,
    EscrowRelease,
    InfluencerBalance,
)
from app.schemas.payment import (
    PaymentPrepareResponse,
    PaymentVerifyRequest,
    BootpayWebhookPayload,
)

logger = logging.getLogger(__name__)

# Escrow fee rate
ESCROW_FEE_RATE = Decimal("0.005")  # 0.5%

# PG fee estimates by method
PG_FEE_RATES = {
    "card": Decimal("0.025"),     # 2.5%
    "vbank": Decimal("0.003"),    # 0.3%
    "bank": Decimal("0.003"),     # 0.3%
    "kakao": Decimal("0.02"),     # 2%
    "naver": Decimal("0.02"),     # 2%
    "toss": Decimal("0.02"),      # 2%
    "default": Decimal("0.025"),  # Default to card rate
}


class PaymentError(TagBuyException):
    """Payment related error"""

    def __init__(self, message: str, code: str = "PAYMENT_ERROR", details: dict = None):
        super().__init__(code=code, message=message, details=details or {})


class PaymentService:
    """Service for payment and escrow operations"""

    def __init__(self):
        self._bootpay = None

    def _get_bootpay(self):
        """Lazy initialization of Bootpay client"""
        if self._bootpay is None:
            if not settings.bootpay_application_id or not settings.bootpay_private_key:
                raise PaymentError(
                    message="Bootpay credentials not configured",
                    code="BOOTPAY_NOT_CONFIGURED"
                )

            from bootpay_backend import BootpayBackend
            self._bootpay = BootpayBackend(
                settings.bootpay_application_id,
                settings.bootpay_private_key
            )
        return self._bootpay

    async def prepare_payment(
        self,
        db: AsyncSession,
        campaign_id: UUID,
        user_id: UUID,
        payment_method: Optional[str] = None,
    ) -> PaymentPrepareResponse:
        """
        Prepare payment data for frontend.
        Frontend will use this to initialize Bootpay widget.
        """
        # Get campaign
        campaign = await db.get(Campaign, campaign_id)
        if not campaign:
            raise PaymentError(
                message="Campaign not found",
                code="CAMPAIGN_NOT_FOUND",
                details={"campaign_id": str(campaign_id)}
            )

        # Check ownership
        if campaign.advertiser_id != user_id:
            raise PaymentError(
                message="Not authorized to pay for this campaign",
                code="NOT_AUTHORIZED"
            )

        # Check if already paid
        existing = await db.execute(
            select(EscrowTransaction)
            .where(EscrowTransaction.campaign_id == campaign_id)
            .where(EscrowTransaction.status == "deposited")
        )
        if existing.scalar_one_or_none():
            raise PaymentError(
                message="Campaign already has an active escrow",
                code="ALREADY_PAID"
            )

        # Calculate fees
        budget = Decimal(str(campaign.budget))
        escrow_fee = budget * ESCROW_FEE_RATE

        # Estimate PG fee
        method = payment_method or "card"
        pg_fee_rate = PG_FEE_RATES.get(method, PG_FEE_RATES["default"])
        pg_fee_estimate = budget * pg_fee_rate

        # Total price depends on who pays PG fee
        if campaign.pg_fee_payer == "advertiser":
            total_price = budget + escrow_fee + pg_fee_estimate
        else:
            # Influencer pays PG fee, so advertiser only pays budget + escrow
            total_price = budget + escrow_fee

        # Generate order ID
        order_id = f"campaign_{campaign_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        return PaymentPrepareResponse(
            order_id=order_id,
            order_name=f"캠페인 예산: {campaign.title}",
            price=int(total_price),  # Bootpay uses integer
            campaign_budget=budget,
            escrow_fee=escrow_fee,
            pg_fee_estimate=pg_fee_estimate,
            pg_fee_payer=campaign.pg_fee_payer or "advertiser",
        )

    async def verify_payment(
        self,
        db: AsyncSession,
        receipt_id: str,
        order_id: str,
        user_id: UUID,
    ) -> tuple[Payment, EscrowTransaction]:
        """
        Verify payment with Bootpay and create escrow.
        Called after frontend receives receipt_id from Bootpay.
        """
        # Get Bootpay client and fetch receipt
        bootpay = self._get_bootpay()
        bootpay.get_access_token()

        try:
            response = bootpay.receipt_payment(receipt_id)
            if response.get("status") != 200 or "data" not in response:
                raise PaymentError(
                    message="Failed to verify payment with Bootpay",
                    code="BOOTPAY_VERIFY_FAILED",
                    details={"receipt_id": receipt_id, "response": response}
                )
            receipt = response["data"]
        except PaymentError:
            raise
        except Exception as e:
            logger.error(f"Failed to get receipt from Bootpay: {e}")
            raise PaymentError(
                message="Failed to verify payment with Bootpay",
                code="BOOTPAY_VERIFY_FAILED",
                details={"receipt_id": receipt_id, "error": str(e)}
            )

        # Check payment status (1 = completed)
        if receipt.get("status") != 1:
            raise PaymentError(
                message="Payment not completed",
                code="PAYMENT_NOT_COMPLETED",
                details={"status": receipt.get("status")}
            )

        # Extract campaign_id from order_id
        # Format: campaign_{uuid}_{timestamp}
        try:
            parts = order_id.split("_")
            campaign_id = UUID(parts[1])
        except (IndexError, ValueError):
            raise PaymentError(
                message="Invalid order_id format",
                code="INVALID_ORDER_ID"
            )

        # Get campaign
        campaign = await db.get(Campaign, campaign_id)
        if not campaign:
            raise PaymentError(
                message="Campaign not found",
                code="CAMPAIGN_NOT_FOUND"
            )

        # Check ownership
        if campaign.advertiser_id != user_id:
            raise PaymentError(
                message="Not authorized",
                code="NOT_AUTHORIZED"
            )

        # Check for duplicate payment
        existing_payment = await db.execute(
            select(Payment).where(Payment.receipt_id == receipt_id)
        )
        if existing_payment.scalar_one_or_none():
            raise PaymentError(
                message="Payment already processed",
                code="DUPLICATE_PAYMENT"
            )

        # Create payment record
        payment = Payment(
            id=uuid4(),
            receipt_id=receipt_id,
            order_id=order_id,
            method=receipt.get("method"),
            method_name=receipt.get("method_name"),
            pg=receipt.get("pg"),
            price=Decimal(str(receipt.get("price", 0))),
            tax_free=Decimal(str(receipt.get("tax_free", 0))),
            status=str(receipt.get("status")),
            status_locale=receipt.get("status_locale"),
            purchased_at=datetime.fromisoformat(receipt["purchased_at"]) if receipt.get("purchased_at") else None,
            campaign_id=campaign_id,
            user_id=user_id,
        )
        db.add(payment)

        # Calculate fees and create escrow
        budget = Decimal(str(campaign.budget))
        escrow_fee = budget * ESCROW_FEE_RATE

        # Get actual PG fee from receipt if available, otherwise estimate
        method = receipt.get("method", "card")
        pg_fee_rate = PG_FEE_RATES.get(method, PG_FEE_RATES["default"])
        pg_fee = budget * pg_fee_rate

        # Net amount for influencers
        net_amount = budget

        escrow = EscrowTransaction(
            id=uuid4(),
            payment_id=payment.id,
            campaign_id=campaign_id,
            total_amount=payment.price,
            escrow_fee=escrow_fee,
            pg_fee=pg_fee,
            net_amount=net_amount,
            remaining_amount=net_amount,
            status="deposited",
            deposited_at=datetime.utcnow(),
        )
        db.add(escrow)

        # Update campaign escrow info
        campaign.escrow_fee = escrow_fee
        campaign.pg_fee = pg_fee

        await db.flush()

        logger.info(f"Payment verified and escrow created: {receipt_id}")
        return payment, escrow

    async def process_webhook(
        self,
        db: AsyncSession,
        payload: BootpayWebhookPayload,
    ) -> None:
        """Process Bootpay webhook for payment status updates"""
        receipt_id = payload.receipt_id

        # Get payment
        result = await db.execute(
            select(Payment).where(Payment.receipt_id == receipt_id)
        )
        payment = result.scalar_one_or_none()

        if not payment:
            # Payment not yet created - might be webhook arriving before verify
            logger.warning(f"Webhook for unknown payment: {receipt_id}")
            return

        # Update payment status
        payment.status = str(payload.status)
        payment.status_locale = self._get_status_locale(payload.status)

        if payload.status == 20:  # Cancelled
            payment.cancelled_at = datetime.fromisoformat(payload.cancelled_at) if payload.cancelled_at else datetime.utcnow()
            payment.cancel_reason = payload.cancel_reason

            # Update escrow if exists
            result = await db.execute(
                select(EscrowTransaction).where(EscrowTransaction.payment_id == payment.id)
            )
            escrow = result.scalar_one_or_none()
            if escrow and escrow.status == "deposited":
                escrow.status = "refunded"
                escrow.refunded_at = datetime.utcnow()

        await db.flush()
        logger.info(f"Webhook processed for payment: {receipt_id}, status: {payload.status}")

    def _get_status_locale(self, status: int) -> str:
        """Get human readable status"""
        status_map = {
            0: "결제 대기",
            1: "결제 완료",
            2: "결제 승인 중",
            20: "결제 취소",
            21: "결제 취소 승인 중",
        }
        return status_map.get(status, "알 수 없음")

    async def release_to_influencer(
        self,
        db: AsyncSession,
        campaign_id: UUID,
        influencer_id: UUID,
        campaign_influencer_id: UUID,
        amount: Decimal,
        reason: str = "content_approved",
    ) -> EscrowRelease:
        """
        Release escrow funds to influencer.
        Called when content is approved and settlement period passed.
        """
        # Get escrow
        result = await db.execute(
            select(EscrowTransaction)
            .where(EscrowTransaction.campaign_id == campaign_id)
            .where(EscrowTransaction.status.in_(["deposited", "partially_released"]))
        )
        escrow = result.scalar_one_or_none()

        if not escrow:
            raise PaymentError(
                message="No active escrow for campaign",
                code="NO_ACTIVE_ESCROW"
            )

        # Check remaining amount
        if escrow.remaining_amount < amount:
            raise PaymentError(
                message="Insufficient escrow balance",
                code="INSUFFICIENT_BALANCE",
                details={
                    "remaining": str(escrow.remaining_amount),
                    "requested": str(amount)
                }
            )

        # Get campaign to check PG fee payer
        campaign = await db.get(Campaign, campaign_id)

        # Calculate net amount
        if campaign.pg_fee_payer == "influencer":
            # Deduct PG fee from influencer's share
            method = (await db.execute(
                select(Payment.method).where(Payment.id == escrow.payment_id)
            )).scalar_one_or_none() or "card"

            pg_fee_rate = PG_FEE_RATES.get(method, PG_FEE_RATES["default"])
            pg_fee_deducted = amount * pg_fee_rate
            net_amount = amount - pg_fee_deducted
        else:
            pg_fee_deducted = Decimal("0")
            net_amount = amount

        # Create release record
        release = EscrowRelease(
            id=uuid4(),
            escrow_transaction_id=escrow.id,
            influencer_id=influencer_id,
            campaign_influencer_id=campaign_influencer_id,
            amount=amount,
            pg_fee_deducted=pg_fee_deducted,
            net_amount=net_amount,
            status="completed",
            reason=reason,
            released_at=datetime.utcnow(),
        )
        db.add(release)

        # Update escrow
        escrow.released_amount += amount
        escrow.remaining_amount -= amount

        if escrow.remaining_amount <= 0:
            escrow.status = "released"
            escrow.released_at = datetime.utcnow()
        else:
            escrow.status = "partially_released"

        # Update influencer balance
        result = await db.execute(
            select(InfluencerBalance)
            .where(InfluencerBalance.influencer_id == influencer_id)
        )
        balance = result.scalar_one_or_none()

        if not balance:
            balance = InfluencerBalance(
                id=uuid4(),
                influencer_id=influencer_id,
                available_balance=Decimal("0"),
                pending_balance=Decimal("0"),
                total_earned=Decimal("0"),
                total_withdrawn=Decimal("0"),
            )
            db.add(balance)

        balance.available_balance += net_amount
        balance.total_earned += net_amount

        await db.flush()

        logger.info(f"Released {net_amount} to influencer {influencer_id}")
        return release

    async def cancel_payment(
        self,
        db: AsyncSession,
        receipt_id: str,
        user_id: UUID,
        reason: str,
        cancel_amount: Optional[int] = None,
    ) -> Payment:
        """Cancel payment through Bootpay"""
        # Get payment
        result = await db.execute(
            select(Payment).where(Payment.receipt_id == receipt_id)
        )
        payment = result.scalar_one_or_none()

        if not payment:
            raise PaymentError(
                message="Payment not found",
                code="PAYMENT_NOT_FOUND"
            )

        if payment.user_id != user_id:
            raise PaymentError(
                message="Not authorized to cancel this payment",
                code="NOT_AUTHORIZED"
            )

        # Check escrow status
        result = await db.execute(
            select(EscrowTransaction)
            .where(EscrowTransaction.payment_id == payment.id)
        )
        escrow = result.scalar_one_or_none()

        if escrow and escrow.status not in ["deposited", "pending"]:
            raise PaymentError(
                message="Cannot cancel: funds already released",
                code="CANNOT_CANCEL",
                details={"escrow_status": escrow.status}
            )

        # Call Bootpay cancel API
        bootpay = self._get_bootpay()
        bootpay.get_access_token()

        try:
            result = bootpay.cancel_payment(
                receipt_id=receipt_id,
                cancel_price=cancel_amount or 0,  # 0 means full refund
                cancel_username="시스템",
                cancel_message=reason,
            )
            if result.get("status") != 200:
                raise PaymentError(
                    message="Failed to cancel payment",
                    code="CANCEL_FAILED",
                    details={"response": result}
                )
        except PaymentError:
            raise
        except Exception as e:
            logger.error(f"Failed to cancel payment: {e}")
            raise PaymentError(
                message="Failed to cancel payment",
                code="CANCEL_FAILED",
                details={"error": str(e)}
            )

        # Update local records
        payment.status = "20"  # Cancelled
        payment.cancelled_at = datetime.utcnow()
        payment.cancel_reason = reason

        if escrow:
            escrow.status = "refunded"
            escrow.refunded_at = datetime.utcnow()

        await db.flush()

        logger.info(f"Payment cancelled: {receipt_id}")
        return payment

    async def get_payment(
        self,
        db: AsyncSession,
        receipt_id: str,
    ) -> Optional[Payment]:
        """Get payment by receipt_id"""
        result = await db.execute(
            select(Payment).where(Payment.receipt_id == receipt_id)
        )
        return result.scalar_one_or_none()

    async def get_campaign_escrow(
        self,
        db: AsyncSession,
        campaign_id: UUID,
    ) -> Optional[EscrowTransaction]:
        """Get escrow for campaign"""
        result = await db.execute(
            select(EscrowTransaction)
            .where(EscrowTransaction.campaign_id == campaign_id)
            .order_by(EscrowTransaction.created_at.desc())
        )
        return result.scalar_one_or_none()

    async def get_influencer_balance(
        self,
        db: AsyncSession,
        influencer_id: UUID,
    ) -> InfluencerBalance:
        """Get or create influencer balance"""
        result = await db.execute(
            select(InfluencerBalance)
            .where(InfluencerBalance.influencer_id == influencer_id)
        )
        balance = result.scalar_one_or_none()

        if not balance:
            balance = InfluencerBalance(
                id=uuid4(),
                influencer_id=influencer_id,
                available_balance=Decimal("0"),
                pending_balance=Decimal("0"),
                total_earned=Decimal("0"),
                total_withdrawn=Decimal("0"),
            )
            db.add(balance)
            await db.flush()

        return balance


# Singleton instance
payment_service = PaymentService()
