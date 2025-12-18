"""
Campaign Matcher - 게시글과 캠페인 요구사항 매칭 로직

주요 기능:
1. 게시글 캡션에서 필수 해시태그 검증
2. 게시글 캡션에서 필수 멘션 검증
3. 콘텐츠 타입 검증 (photo, video, album 등)
4. 캠페인 기간 내 게시 여부 검증
5. 매칭 점수 계산
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.core.constants import ContentStatus, MediaType
from app.models.campaign import Campaign
from app.models.influencer import Influencer
from app.models.content import CampaignContent
from app.integrations.instagram.client import InstagramMediaInfo

logger = logging.getLogger(__name__)

# Instagram media type 매핑
MEDIA_TYPE_MAP = {
    1: "photo",
    2: "video",
    8: "album",
}


def match_post_to_campaign(
    post: InstagramMediaInfo,
    campaign: Campaign
) -> Dict[str, Any]:
    """
    게시글이 캠페인 요구사항을 충족하는지 검증

    Args:
        post: Instagram 게시글 정보
        campaign: 캠페인 정보

    Returns:
        {
            "is_match": bool,
            "score": float,  # 0-100
            "details": {
                "hashtags": {"required": [...], "found": [...], "missing": [...]},
                "mentions": {"required": [...], "found": [...], "missing": [...]},
                "content_type": {"required": "...", "actual": "...", "match": bool},
                "posted_within_period": bool
            }
        }
    """
    result = {
        "is_match": False,
        "score": 0,
        "details": {}
    }

    caption = post.caption_text or ""
    caption_lower = caption.lower()

    # 1. 해시태그 검증
    required_hashtags = campaign.required_hashtags or []
    found_hashtags = []
    missing_hashtags = []

    # 캡션에서 해시태그 추출
    caption_hashtags = set(re.findall(r'#(\w+)', caption_lower))

    for tag in required_hashtags:
        tag_normalized = tag.lower().replace("#", "")
        if tag_normalized in caption_hashtags:
            found_hashtags.append(tag)
        else:
            missing_hashtags.append(tag)

    result["details"]["hashtags"] = {
        "required": required_hashtags,
        "found": found_hashtags,
        "missing": missing_hashtags
    }

    # 2. 멘션 검증
    required_mentions = campaign.required_mentions or []
    found_mentions = []
    missing_mentions = []

    # 캡션에서 멘션 추출
    caption_mentions = set(re.findall(r'@(\w+)', caption_lower))

    for mention in required_mentions:
        mention_normalized = mention.lower().replace("@", "")
        if mention_normalized in caption_mentions:
            found_mentions.append(mention)
        else:
            missing_mentions.append(mention)

    result["details"]["mentions"] = {
        "required": required_mentions,
        "found": found_mentions,
        "missing": missing_mentions
    }

    # 3. 콘텐츠 타입 검증
    actual_type = MEDIA_TYPE_MAP.get(post.media_type, "unknown")
    required_type = campaign.content_type

    type_match = (
        not required_type or
        required_type == actual_type or
        required_type == "any"
    )

    result["details"]["content_type"] = {
        "required": required_type,
        "actual": actual_type,
        "match": type_match
    }

    # 4. 기간 내 게시 여부
    post_time = post.taken_at
    if post_time:
        # timezone 제거 (naive datetime으로 비교)
        if post_time.tzinfo:
            post_time = post_time.replace(tzinfo=None)

        campaign_start = campaign.start_date
        campaign_end = campaign.end_date

        if campaign_start and campaign_start.tzinfo:
            campaign_start = campaign_start.replace(tzinfo=None)
        if campaign_end and campaign_end.tzinfo:
            campaign_end = campaign_end.replace(tzinfo=None)

        posted_within = True
        if campaign_start and post_time < campaign_start:
            posted_within = False
        if campaign_end and post_time > campaign_end:
            posted_within = False
    else:
        posted_within = False

    result["details"]["posted_within_period"] = posted_within

    # 5. 최종 판정
    hashtag_pass = len(missing_hashtags) == 0 if required_hashtags else True
    mention_pass = len(missing_mentions) == 0 if required_mentions else True

    result["is_match"] = all([
        hashtag_pass,
        mention_pass,
        type_match,
        posted_within
    ])

    # 6. 점수 계산 (부분 매칭 시 참고용)
    scores = []
    if required_hashtags:
        scores.append(len(found_hashtags) / len(required_hashtags) * 100)
    if required_mentions:
        scores.append(len(found_mentions) / len(required_mentions) * 100)
    if required_type:
        scores.append(100 if type_match else 0)
    if campaign.start_date or campaign.end_date:
        scores.append(100 if posted_within else 0)

    result["score"] = sum(scores) / len(scores) if scores else 100

    logger.debug(
        f"Match result for post {post.pk}: "
        f"is_match={result['is_match']}, score={result['score']:.1f}"
    )

    return result


def auto_register_content(
    db: Session,
    campaign: Campaign,
    influencer: Influencer,
    post: InstagramMediaInfo,
    match_result: Dict[str, Any]
) -> CampaignContent:
    """
    매칭된 게시글을 자동으로 콘텐츠로 등록

    Args:
        db: 데이터베이스 세션
        campaign: 캠페인
        influencer: 인플루언서
        post: Instagram 게시글
        match_result: 매칭 결과

    Returns:
        생성된 CampaignContent
    """
    # media_type 변환
    media_type_enum = {
        1: MediaType.PHOTO,
        2: MediaType.VIDEO,
        8: MediaType.CAROUSEL,
    }.get(post.media_type, MediaType.PHOTO)

    # 초기 메트릭 스냅샷
    initial_metrics = {
        "like_count": post.like_count,
        "comment_count": post.comment_count,
        "play_count": post.play_count,
        "captured_at": datetime.utcnow().isoformat()
    }

    # 콘텐츠 생성
    content = CampaignContent(
        campaign_id=campaign.id,
        influencer_id=influencer.id,
        instagram_media_pk=post.pk,
        post_url=f"https://www.instagram.com/p/{post.code}/",
        post_type=media_type_enum,
        status=ContentStatus.PENDING,
        initial_metrics=initial_metrics,
        ai_analysis=match_result["details"],
        ai_score=match_result["score"],
        posted_at=post.taken_at,
        submitted_at=datetime.utcnow(),
    )

    db.add(content)
    db.commit()
    db.refresh(content)

    logger.info(
        f"Auto-registered content: campaign={campaign.title}, "
        f"influencer={influencer.username}, post={post.code}"
    )

    return content


def find_matching_campaigns(
    db: Session,
    influencer_id: str,
    post: InstagramMediaInfo
) -> List[Dict[str, Any]]:
    """
    게시글과 매칭되는 모든 캠페인 찾기 (역방향 검색)

    Args:
        db: 데이터베이스 세션
        influencer_id: 인플루언서 ID
        post: Instagram 게시글

    Returns:
        매칭된 캠페인과 결과 목록
    """
    from sqlalchemy import select, and_
    from uuid import UUID
    from app.models.campaign import CampaignInfluencer

    # 인플루언서가 참여 중인 활성 캠페인 조회
    participations = db.execute(
        select(CampaignInfluencer).where(
            and_(
                CampaignInfluencer.influencer_id == UUID(influencer_id),
                CampaignInfluencer.is_selected == True
            )
        )
    ).scalars().all()

    matched_campaigns = []

    for participation in participations:
        campaign = db.get(Campaign, participation.campaign_id)
        if not campaign:
            continue

        # 이미 콘텐츠 등록된 경우 스킵
        existing = db.execute(
            select(CampaignContent).where(
                and_(
                    CampaignContent.campaign_id == campaign.id,
                    CampaignContent.influencer_id == UUID(influencer_id)
                )
            )
        ).scalar_one_or_none()

        if existing:
            continue

        match_result = match_post_to_campaign(post, campaign)
        if match_result["is_match"]:
            matched_campaigns.append({
                "campaign": campaign,
                "match_result": match_result
            })

    return matched_campaigns
