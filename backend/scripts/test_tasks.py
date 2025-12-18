#!/usr/bin/env python3
"""
Celery 태스크 테스트 스크립트

사용법:
    # 태스크 import 테스트
    python scripts/test_tasks.py --check

    # 캠페인 매칭 테스트 (DB 없이)
    python scripts/test_tasks.py --test-matcher

실행 전 필요사항:
    - Redis 실행 중
    - .env 파일 설정
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime, timedelta

# 프로젝트 루트를 path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))


def check_imports():
    """Import 테스트"""
    print("[*] Checking imports...")

    try:
        from app.tasks import celery_app
        print(f"[+] Celery app: {celery_app.main}")
    except Exception as e:
        print(f"[!] Failed to import celery_app: {e}")
        return False

    try:
        from app.tasks.post_scanner import scan_active_campaigns, fetch_influencer_posts
        print("[+] post_scanner tasks imported")
    except Exception as e:
        print(f"[!] Failed to import post_scanner: {e}")
        return False

    try:
        from app.tasks.campaign_matcher import match_post_to_campaign
        print("[+] campaign_matcher imported")
    except Exception as e:
        print(f"[!] Failed to import campaign_matcher: {e}")
        return False

    try:
        from app.tasks.metrics_collector import update_content_metrics
        print("[+] metrics_collector imported")
    except Exception as e:
        print(f"[!] Failed to import metrics_collector: {e}")
        return False

    try:
        from app.tasks.content_checker import check_content_existence
        print("[+] content_checker imported")
    except Exception as e:
        print(f"[!] Failed to import content_checker: {e}")
        return False

    print("\n[+] All imports successful!")
    return True


def test_campaign_matcher():
    """캠페인 매칭 로직 테스트 (DB 없이)"""
    print("\n[*] Testing campaign matcher...")

    from dataclasses import dataclass
    from datetime import datetime
    from typing import Optional, List

    # Mock 객체들
    @dataclass
    class MockPost:
        pk: str
        code: str
        media_type: int
        like_count: int
        comment_count: int
        play_count: Optional[int]
        taken_at: datetime
        caption_text: str

    @dataclass
    class MockCampaign:
        required_hashtags: List[str]
        required_mentions: List[str]
        content_type: Optional[str]
        start_date: datetime
        end_date: datetime

    from app.tasks.campaign_matcher import match_post_to_campaign

    # 테스트 1: 모든 조건 충족
    print("\n[Test 1] All conditions met")
    post1 = MockPost(
        pk="123",
        code="ABC",
        media_type=1,
        like_count=100,
        comment_count=10,
        play_count=None,
        taken_at=datetime.now(),
        caption_text="오늘의 #광고 #협찬 @brand_account 정말 좋아요!"
    )
    campaign1 = MockCampaign(
        required_hashtags=["광고", "협찬"],
        required_mentions=["brand_account"],
        content_type="photo",
        start_date=datetime.now() - timedelta(days=1),
        end_date=datetime.now() + timedelta(days=7)
    )

    result1 = match_post_to_campaign(post1, campaign1)
    print(f"    is_match: {result1['is_match']}")
    print(f"    score: {result1['score']:.1f}")
    print(f"    details: {result1['details']}")
    assert result1["is_match"] == True, "Should match!"

    # 테스트 2: 해시태그 누락
    print("\n[Test 2] Missing hashtag")
    post2 = MockPost(
        pk="124",
        code="DEF",
        media_type=1,
        like_count=100,
        comment_count=10,
        play_count=None,
        taken_at=datetime.now(),
        caption_text="오늘의 #광고 @brand_account"  # #협찬 누락
    )

    result2 = match_post_to_campaign(post2, campaign1)
    print(f"    is_match: {result2['is_match']}")
    print(f"    score: {result2['score']:.1f}")
    print(f"    missing hashtags: {result2['details']['hashtags']['missing']}")
    assert result2["is_match"] == False, "Should not match!"

    # 테스트 3: 기간 외 게시
    print("\n[Test 3] Posted outside campaign period")
    post3 = MockPost(
        pk="125",
        code="GHI",
        media_type=1,
        like_count=100,
        comment_count=10,
        play_count=None,
        taken_at=datetime.now() - timedelta(days=30),  # 30일 전
        caption_text="#광고 #협찬 @brand_account"
    )

    result3 = match_post_to_campaign(post3, campaign1)
    print(f"    is_match: {result3['is_match']}")
    print(f"    posted_within_period: {result3['details']['posted_within_period']}")
    assert result3["is_match"] == False, "Should not match (outside period)!"

    print("\n[+] All matcher tests passed!")
    return True


def test_celery_connection():
    """Celery & Redis 연결 테스트"""
    print("\n[*] Testing Celery connection...")

    try:
        from app.tasks import celery_app

        # Ping Redis
        result = celery_app.control.ping(timeout=2)
        if result:
            print(f"[+] Celery workers responding: {result}")
        else:
            print("[!] No Celery workers found (this is OK if workers aren't running)")

        print("[+] Celery connection OK")
        return True

    except Exception as e:
        print(f"[!] Celery connection failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Celery 태스크 테스트")
    parser.add_argument("--check", action="store_true", help="Import 테스트")
    parser.add_argument("--test-matcher", action="store_true", help="캠페인 매칭 테스트")
    parser.add_argument("--test-celery", action="store_true", help="Celery 연결 테스트")
    parser.add_argument("--all", action="store_true", help="모든 테스트 실행")

    args = parser.parse_args()

    if args.all or args.check:
        if not check_imports():
            sys.exit(1)

    if args.all or args.test_matcher:
        if not test_campaign_matcher():
            sys.exit(1)

    if args.all or args.test_celery:
        if not test_celery_connection():
            sys.exit(1)

    if not any([args.check, args.test_matcher, args.test_celery, args.all]):
        parser.print_help()


if __name__ == "__main__":
    main()
