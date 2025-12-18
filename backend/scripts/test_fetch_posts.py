#!/usr/bin/env python3
"""
Instagram 게시글 가져오기 테스트 스크립트

사용법:
    python scripts/test_fetch_posts.py <username> [--amount 12]

예시:
    python scripts/test_fetch_posts.py nike --amount 5
"""

import argparse
import asyncio
import json
import os
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

# 프로젝트 루트를 path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from instagrapi import Client
from instagrapi.exceptions import (
    LoginRequired,
    UserNotFound,
    PrivateError,
)


def datetime_handler(obj):
    """JSON serialization을 위한 datetime 핸들러"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def fetch_user_posts(username: str, amount: int = 12, ig_username: str = None, ig_password: str = None):
    """
    Instagram 사용자의 최근 게시글 가져오기

    Args:
        username: 조회할 Instagram 사용자명
        amount: 가져올 게시글 수
        ig_username: 로그인용 Instagram 계정
        ig_password: 로그인용 Instagram 비밀번호
    """
    client = Client()

    # 한국어 설정
    client.set_locale("ko_KR")
    client.set_timezone_offset(9 * 3600)

    # 세션 파일 경로
    session_dir = Path(__file__).parent.parent / "sessions"
    session_dir.mkdir(exist_ok=True)

    session_file = session_dir / f"{ig_username}.json" if ig_username else None

    # 로그인 시도
    if ig_username and ig_password:
        try:
            # 기존 세션 로드 시도
            if session_file and session_file.exists():
                print(f"[*] 기존 세션 로드 시도: {session_file}")
                client.load_settings(str(session_file))
                client.login(ig_username, ig_password)
                print("[+] 세션 로드 성공!")
            else:
                print(f"[*] 새로 로그인 중: {ig_username}")
                client.login(ig_username, ig_password)
                # 세션 저장
                if session_file:
                    client.dump_settings(str(session_file))
                    print(f"[+] 세션 저장됨: {session_file}")
        except Exception as e:
            print(f"[!] 로그인 실패: {e}")
            print("[*] 로그인 없이 시도...")

    # 사용자 정보 조회
    print(f"\n[*] 사용자 조회 중: @{username}")
    try:
        user = client.user_info_by_username(username)
    except UserNotFound:
        print(f"[!] 사용자를 찾을 수 없음: @{username}")
        return None
    except PrivateError:
        print(f"[!] 비공개 계정: @{username}")
        return None
    except LoginRequired:
        print("[!] 로그인이 필요합니다. Instagram 계정 정보를 제공해주세요.")
        return None

    user_info = {
        "pk": str(user.pk),
        "username": user.username,
        "full_name": user.full_name,
        "biography": user.biography,
        "follower_count": user.follower_count,
        "following_count": user.following_count,
        "media_count": user.media_count,
        "is_verified": user.is_verified,
        "is_business": user.is_business,
        "is_private": user.is_private,
        "category": user.category_name,
        "profile_pic_url": str(user.profile_pic_url) if user.profile_pic_url else None,
    }

    print(f"[+] 사용자 발견!")
    print(f"    이름: {user.full_name}")
    print(f"    팔로워: {user.follower_count:,}")
    print(f"    게시물: {user.media_count:,}")
    print(f"    비공개: {user.is_private}")

    if user.is_private:
        print("[!] 비공개 계정이므로 게시글을 가져올 수 없습니다.")
        return {"user": user_info, "posts": []}

    # 게시글 가져오기
    print(f"\n[*] 최근 게시글 {amount}개 가져오는 중...")
    try:
        medias = client.user_medias(user.pk, amount)
    except LoginRequired:
        print("[!] 게시글 조회에 로그인이 필요합니다.")
        return {"user": user_info, "posts": []}
    except Exception as e:
        print(f"[!] 게시글 조회 실패: {e}")
        return {"user": user_info, "posts": []}

    posts = []
    for media in medias:
        media_type_map = {1: "photo", 2: "video", 8: "album"}

        post = {
            "pk": str(media.pk),
            "code": media.code,
            "url": f"https://www.instagram.com/p/{media.code}/",
            "media_type": media_type_map.get(media.media_type, "unknown"),
            "like_count": media.like_count or 0,
            "comment_count": media.comment_count or 0,
            "play_count": media.play_count,  # 동영상만
            "taken_at": media.taken_at.isoformat() if media.taken_at else None,
            "caption_text": media.caption_text,
            "thumbnail_url": str(media.thumbnail_url) if media.thumbnail_url else None,
        }
        posts.append(post)

        # 진행 상황 출력
        print(f"    [{len(posts)}/{amount}] {media.code} - "
              f"좋아요: {post['like_count']:,}, 댓글: {post['comment_count']:,}")

    result = {
        "fetched_at": datetime.now().isoformat(),
        "user": user_info,
        "posts": posts,
        "total_posts_fetched": len(posts),
    }

    return result


def main():
    parser = argparse.ArgumentParser(description="Instagram 사용자 게시글 가져오기")
    parser.add_argument("username", help="조회할 Instagram 사용자명")
    parser.add_argument("--amount", "-n", type=int, default=12, help="가져올 게시글 수 (기본: 12)")
    parser.add_argument("--output", "-o", help="출력 JSON 파일 경로")
    parser.add_argument("--ig-username", help="로그인용 Instagram 사용자명")
    parser.add_argument("--ig-password", help="로그인용 Instagram 비밀번호")

    args = parser.parse_args()

    # 환경변수에서 계정 정보 읽기
    ig_username = args.ig_username or os.getenv("INSTAGRAM_USERNAME")
    ig_password = args.ig_password or os.getenv("INSTAGRAM_PASSWORD")

    if not ig_username or not ig_password:
        print("[!] Instagram 계정 정보가 없습니다.")
        print("    환경변수 INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD를 설정하거나")
        print("    --ig-username, --ig-password 옵션을 사용하세요.")
        print("\n[*] 로그인 없이 시도합니다 (제한된 정보만 조회 가능)...")

    # 게시글 가져오기
    result = fetch_user_posts(
        username=args.username,
        amount=args.amount,
        ig_username=ig_username,
        ig_password=ig_password,
    )

    if result is None:
        sys.exit(1)

    # 결과 저장
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(exist_ok=True)

    output_file = args.output or str(output_dir / f"{args.username}_posts.json")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=datetime_handler)

    print(f"\n[+] 완료! 결과 저장됨: {output_file}")
    print(f"    총 {len(result['posts'])}개 게시글 수집")

    # 간단한 통계
    if result["posts"]:
        total_likes = sum(p["like_count"] for p in result["posts"])
        total_comments = sum(p["comment_count"] for p in result["posts"])
        avg_likes = total_likes / len(result["posts"])
        avg_comments = total_comments / len(result["posts"])

        print(f"\n[통계]")
        print(f"    평균 좋아요: {avg_likes:,.0f}")
        print(f"    평균 댓글: {avg_comments:,.0f}")
        print(f"    인게이지먼트율: {(avg_likes + avg_comments) / result['user']['follower_count'] * 100:.2f}%")


if __name__ == "__main__":
    main()
