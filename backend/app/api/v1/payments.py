"""Payment API endpoints"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.payment import (
    Payment,
    EscrowTransaction,
    EscrowRelease,
    InfluencerBalance,
    Withdrawal,
)
from app.models.influencer import Influencer
from app.schemas.payment import (
    PaymentPrepareRequest,
    PaymentPrepareResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
    PaymentResponse,
    PaymentListResponse,
    PaymentCancelRequest,
    EscrowResponse,
    EscrowReleaseRequest,
    EscrowReleaseResponse,
    BalanceResponse,
    SettlementResponse,
    SettlementListResponse,
    WithdrawalRequest,
    WithdrawalResponse,
    WithdrawalListResponse,
    BootpayWebhookPayload,
)
from app.services.payment_service import payment_service, PaymentError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


# ==================== Payment Endpoints ====================

@router.post("/prepare", response_model=PaymentPrepareResponse)
async def prepare_payment(
    request: PaymentPrepareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Prepare payment for frontend Bootpay widget.

    Returns order_id, price, and fee breakdown for frontend to initialize payment.
    """
    try:
        result = await payment_service.prepare_payment(
            db=db,
            campaign_id=request.campaign_id,
            user_id=current_user.id,
            payment_method=request.payment_method,
        )
        return result
    except PaymentError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.to_dict())


@router.post("/verify", response_model=PaymentVerifyResponse)
async def verify_payment(
    request: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verify payment after Bootpay callback.

    Frontend should call this after receiving receipt_id from Bootpay.
    This will verify the payment and create an escrow.
    """
    try:
        payment, escrow = await payment_service.verify_payment(
            db=db,
            receipt_id=request.receipt_id,
            order_id=request.order_id,
            user_id=current_user.id,
        )
        return PaymentVerifyResponse(
            success=True,
            payment_id=payment.id,
            escrow_id=escrow.id,
            message="결제가 확인되었습니다. 에스크로에 예치되었습니다.",
        )
    except PaymentError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.to_dict())


@router.post("/webhook")
async def handle_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Bootpay webhook notifications.

    Bootpay sends webhooks for payment status changes.
    Must return HTTP 200 within 5 seconds.
    """
    try:
        body = await request.json()
        payload = BootpayWebhookPayload(**body)

        await payment_service.process_webhook(db=db, payload=payload)

        return JSONResponse(content={"status": 200})
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        # Still return 200 to acknowledge receipt
        return JSONResponse(content={"status": 200, "error": str(e)})


@router.get("/history", response_model=PaymentListResponse)
async def get_payment_history(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get payment history for current user"""
    # Get payments
    query = (
        select(Payment)
        .where(Payment.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    payments = result.scalars().all()

    # Get total count
    count_query = (
        select(func.count())
        .select_from(Payment)
        .where(Payment.user_id == current_user.id)
    )
    total = await db.execute(count_query)
    total_count = total.scalar()

    return PaymentListResponse(
        payments=[PaymentResponse.model_validate(p) for p in payments],
        total=total_count,
        limit=limit,
        offset=offset,
    )


@router.get("/{receipt_id}", response_model=PaymentResponse)
async def get_payment(
    receipt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get payment by receipt_id"""
    payment = await payment_service.get_payment(db, receipt_id)

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    if payment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this payment"
        )

    return PaymentResponse.model_validate(payment)


@router.post("/cancel")
async def cancel_payment(
    request: PaymentCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a payment"""
    try:
        payment = await payment_service.cancel_payment(
            db=db,
            receipt_id=request.receipt_id,
            user_id=current_user.id,
            reason=request.reason,
            cancel_amount=request.cancel_amount,
        )
        return {
            "success": True,
            "message": "결제가 취소되었습니다.",
            "payment_id": str(payment.id),
        }
    except PaymentError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.to_dict())


# ==================== Escrow Endpoints ====================

@router.get("/escrow/{campaign_id}", response_model=EscrowResponse)
async def get_escrow(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get escrow status for a campaign"""
    escrow = await payment_service.get_campaign_escrow(db, campaign_id)

    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escrow not found for this campaign"
        )

    return EscrowResponse.model_validate(escrow)


# ==================== Balance & Settlement Endpoints (Influencer) ====================

@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's balance (for influencers)"""
    # Get influencer
    result = await db.execute(
        select(Influencer).where(Influencer.user_id == current_user.id)
    )
    influencer = result.scalar_one_or_none()

    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Influencer profile not found"
        )

    balance = await payment_service.get_influencer_balance(db, influencer.id)
    return BalanceResponse.model_validate(balance)


@router.get("/settlements", response_model=SettlementListResponse)
async def get_settlements(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get settlement history (for influencers)"""
    # Get influencer
    result = await db.execute(
        select(Influencer).where(Influencer.user_id == current_user.id)
    )
    influencer = result.scalar_one_or_none()

    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Influencer profile not found"
        )

    # Get releases
    from app.models.campaign import Campaign

    query = (
        select(EscrowRelease, Campaign.title)
        .join(EscrowTransaction, EscrowRelease.escrow_transaction_id == EscrowTransaction.id)
        .join(Campaign, EscrowTransaction.campaign_id == Campaign.id)
        .where(EscrowRelease.influencer_id == influencer.id)
        .order_by(EscrowRelease.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    releases = result.all()

    # Get total count
    count_query = (
        select(func.count())
        .select_from(EscrowRelease)
        .where(EscrowRelease.influencer_id == influencer.id)
    )
    total = await db.execute(count_query)
    total_count = total.scalar()

    settlements = [
        SettlementResponse(
            id=release.id,
            campaign_id=release.escrow_transaction.campaign_id,
            campaign_title=title,
            amount=release.amount,
            net_amount=release.net_amount,
            status=release.status,
            reason=release.reason or "",
            released_at=release.released_at,
            created_at=release.created_at,
        )
        for release, title in releases
    ]

    return SettlementListResponse(
        settlements=settlements,
        total=total_count,
        limit=limit,
        offset=offset,
    )


# ==================== Withdrawal Endpoints ====================

@router.post("/withdrawals", response_model=WithdrawalResponse)
async def request_withdrawal(
    request: WithdrawalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request withdrawal of available balance"""
    # Get influencer
    result = await db.execute(
        select(Influencer).where(Influencer.user_id == current_user.id)
    )
    influencer = result.scalar_one_or_none()

    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Influencer profile not found"
        )

    # Get balance
    balance = await payment_service.get_influencer_balance(db, influencer.id)

    if balance.available_balance < request.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: {balance.available_balance}"
        )

    # Get bank account info
    if request.bank_account:
        bank_code = request.bank_account.bank_code
        bank_name = request.bank_account.bank_name
        account_number = request.bank_account.account_number
        account_holder = request.bank_account.account_holder
    else:
        # Use saved bank account (TODO: implement saved accounts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bank account information required"
        )

    # Create withdrawal request
    from uuid import uuid4
    from datetime import datetime

    withdrawal = Withdrawal(
        id=uuid4(),
        influencer_id=influencer.id,
        amount=request.amount,
        fee=0,  # Currently no withdrawal fee
        net_amount=request.amount,
        bank_code=bank_code,
        bank_name=bank_name,
        account_number=account_number,
        account_holder=account_holder,
        status="pending",
        requested_at=datetime.utcnow(),
    )
    db.add(withdrawal)

    # Deduct from available balance
    balance.available_balance -= request.amount

    await db.flush()

    # Mask account number for response
    masked_account = account_number[:3] + "*" * (len(account_number) - 6) + account_number[-3:]

    return WithdrawalResponse(
        id=withdrawal.id,
        amount=withdrawal.amount,
        fee=withdrawal.fee,
        net_amount=withdrawal.net_amount,
        bank_name=withdrawal.bank_name,
        account_number=masked_account,
        status=withdrawal.status,
        requested_at=withdrawal.requested_at,
        completed_at=withdrawal.completed_at,
    )


@router.get("/withdrawals", response_model=WithdrawalListResponse)
async def get_withdrawals(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get withdrawal history"""
    # Get influencer
    result = await db.execute(
        select(Influencer).where(Influencer.user_id == current_user.id)
    )
    influencer = result.scalar_one_or_none()

    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Influencer profile not found"
        )

    # Get withdrawals
    query = (
        select(Withdrawal)
        .where(Withdrawal.influencer_id == influencer.id)
        .order_by(Withdrawal.requested_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    withdrawals = result.scalars().all()

    # Get total count
    count_query = (
        select(func.count())
        .select_from(Withdrawal)
        .where(Withdrawal.influencer_id == influencer.id)
    )
    total = await db.execute(count_query)
    total_count = total.scalar()

    withdrawal_responses = []
    for w in withdrawals:
        masked_account = w.account_number[:3] + "*" * (len(w.account_number) - 6) + w.account_number[-3:]
        withdrawal_responses.append(
            WithdrawalResponse(
                id=w.id,
                amount=w.amount,
                fee=w.fee,
                net_amount=w.net_amount,
                bank_name=w.bank_name,
                account_number=masked_account,
                status=w.status,
                requested_at=w.requested_at,
                completed_at=w.completed_at,
            )
        )

    return WithdrawalListResponse(
        withdrawals=withdrawal_responses,
        total=total_count,
        limit=limit,
        offset=offset,
    )
