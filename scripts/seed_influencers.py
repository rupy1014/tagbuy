#!/usr/bin/env python3
"""
Seed influencers data from tagby JSON export.

Usage:
    python scripts/seed_influencers.py [--json-path PATH] [--batch-size N] [--dry-run]

This script imports influencer data from tagby_all_influencers.json into the database.
"""
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import asyncpg
from decimal import Decimal


# Platform mapping from tagby service names
PLATFORM_MAP = {
    "INSTA_BASIC": "instagram",
    "INSTA_BIZ": "instagram",
    "INSTA_REEL": "instagram",
    "INSTA_STORY": "instagram",
    "TIKTOK": "tiktok",
    "YOUTUBE": "youtube",
    "NAVER_BLOG": "naver_blog",
}


def parse_birth_year(birth: Optional[str]) -> Optional[int]:
    """Extract year from birth date string (e.g., '1995-01-01' -> 1995)"""
    if not birth:
        return None
    try:
        return int(birth.split("-")[0])
    except (ValueError, IndexError):
        return None


def calculate_tier(follower_count: int) -> str:
    """Calculate influencer tier based on follower count"""
    if follower_count >= 1_000_000:
        return "mega"
    elif follower_count >= 100_000:
        return "macro"
    elif follower_count >= 10_000:
        return "micro"
    elif follower_count >= 1_000:
        return "nano"
    return "unknown"


def calculate_engagement_rate(avg_likes: int, avg_comments: int, follower_count: int) -> Optional[Decimal]:
    """Calculate engagement rate as percentage (capped at 100%)"""
    if not follower_count or follower_count == 0:
        return None
    engagement = ((avg_likes or 0) + (avg_comments or 0)) / follower_count * 100
    # Cap at 99.99% to fit NUMERIC(5,2)
    engagement = min(engagement, 99.99)
    return Decimal(str(round(engagement, 2)))


def transform_influencer(raw: dict) -> Optional[dict]:
    """Transform raw tagby data to our schema"""
    service = raw.get("service", "")
    platform = PLATFORM_MAP.get(service)

    if not platform:
        return None  # Skip unknown platforms

    uid = raw.get("uid")
    username = raw.get("username")

    if not uid or not username:
        return None  # Skip invalid records

    follower_count = raw.get("follower_count", 0) or 0
    avg_likes = raw.get("avg_likes", 0) or 0
    avg_comments = raw.get("avg_comments", 0) or 0

    # Extract nested data
    inf_idx = raw.get("inf_idx") or {}
    sns_label = raw.get("sns_label") or {}

    categories = sns_label.get("category") if sns_label else None

    return {
        "id": str(uuid4()),
        "platform": platform,
        "platform_uid": str(uid),
        "username": username,
        "full_name": None,
        "profile_pic_url": raw.get("profile_img_url"),
        "biography": None,
        "landing_url": raw.get("landing_url"),
        "gender": inf_idx.get("gender"),
        "birth_year": parse_birth_year(inf_idx.get("birth")),
        "follower_count": follower_count,
        "following_count": None,
        "media_count": None,
        "avg_likes": avg_likes,
        "avg_comments": avg_comments,
        "avg_reach": raw.get("avg_reach"),
        "engagement_rate": calculate_engagement_rate(avg_likes, avg_comments, follower_count),
        "influence_score": Decimal(str(raw.get("isi", 0) or 0)),
        "trust_score": None,
        "fake_follower_ratio": None,
        "tier": calculate_tier(follower_count),
        "categories": categories,
        "is_verified": False,
        "is_business": False,
        "ad_rate": raw.get("ad_rate", 0) or 0,
        "public_email": None,
        "public_phone": None,
        "source": "tagby_import",
        "source_idx": raw.get("idx"),
        "last_synced_at": None,
        "sync_error": None,
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }


async def seed_influencers(
    json_path: str,
    database_url: str,
    batch_size: int = 500,
    dry_run: bool = False
) -> dict:
    """
    Seed influencers from JSON file to database.

    Returns:
        dict with stats: total, imported, skipped, errors
    """
    # Load JSON data
    print(f"Loading data from {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    print(f"Loaded {len(raw_data)} records")

    # Transform data
    print("Transforming data...")
    transformed = []
    skipped = 0
    platform_counts = {}

    for raw in raw_data:
        result = transform_influencer(raw)
        if result:
            transformed.append(result)
            platform = result["platform"]
            platform_counts[platform] = platform_counts.get(platform, 0) + 1
        else:
            skipped += 1

    print(f"Transformed: {len(transformed)}, Skipped: {skipped}")
    print(f"Platform breakdown: {platform_counts}")

    if dry_run:
        print("Dry run - not inserting into database")
        return {
            "total": len(raw_data),
            "transformed": len(transformed),
            "skipped": skipped,
            "platform_counts": platform_counts,
        }

    # Connect to database
    # Convert asyncpg URL format
    db_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    print(f"Connecting to database...")
    conn = await asyncpg.connect(db_url)

    try:
        # Check if table is empty
        count = await conn.fetchval("SELECT COUNT(*) FROM influencers")
        if count > 0:
            print(f"Table already has {count} records. Skipping seed.")
            return {
                "total": len(raw_data),
                "imported": 0,
                "skipped": len(raw_data),
                "reason": "table_not_empty",
            }

        # Insert in batches
        print(f"Inserting {len(transformed)} records in batches of {batch_size}...")
        inserted = 0
        errors = 0

        for i in range(0, len(transformed), batch_size):
            batch = transformed[i:i + batch_size]

            try:
                # Prepare values for batch insert
                await conn.executemany(
                    """
                    INSERT INTO influencers (
                        id, platform, platform_uid, username, full_name,
                        profile_pic_url, biography, landing_url, gender, birth_year,
                        follower_count, following_count, media_count,
                        avg_likes, avg_comments, avg_reach, engagement_rate,
                        influence_score, trust_score, fake_follower_ratio,
                        tier, categories, is_verified, is_business, ad_rate,
                        public_email, public_phone, source, source_idx,
                        last_synced_at, sync_error, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                        $31, $32, $33
                    )
                    ON CONFLICT (platform, platform_uid) DO NOTHING
                    """,
                    [
                        (
                            r["id"], r["platform"], r["platform_uid"], r["username"], r["full_name"],
                            r["profile_pic_url"], r["biography"], r["landing_url"], r["gender"], r["birth_year"],
                            r["follower_count"], r["following_count"], r["media_count"],
                            r["avg_likes"], r["avg_comments"], r["avg_reach"], r["engagement_rate"],
                            r["influence_score"], r["trust_score"], r["fake_follower_ratio"],
                            r["tier"], r["categories"], r["is_verified"], r["is_business"], r["ad_rate"],
                            r["public_email"], r["public_phone"], r["source"], r["source_idx"],
                            r["last_synced_at"], r["sync_error"], r["created_at"], r["updated_at"],
                        )
                        for r in batch
                    ]
                )
                inserted += len(batch)
                print(f"  Inserted batch {i // batch_size + 1}: {inserted}/{len(transformed)}")
            except Exception as e:
                print(f"  Error in batch {i // batch_size + 1}: {e}")
                errors += len(batch)

        # Verify
        final_count = await conn.fetchval("SELECT COUNT(*) FROM influencers")
        print(f"Done! Total records in database: {final_count}")

        return {
            "total": len(raw_data),
            "imported": inserted,
            "skipped": skipped,
            "errors": errors,
            "platform_counts": platform_counts,
        }

    finally:
        await conn.close()


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Seed influencers from JSON")
    parser.add_argument(
        "--json-path",
        default="/app/data/tagby_all_influencers.json",
        help="Path to JSON file"
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/tagbuy"),
        help="Database URL"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for inserts"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't actually insert, just show stats"
    )

    args = parser.parse_args()

    # Check if file exists at alternative locations
    json_path = args.json_path
    if not os.path.exists(json_path):
        alt_paths = [
            "/Users/taesupyoon/sideProjects/tagbuy/tagby_all_influencers.json",
            "./tagby_all_influencers.json",
            "../tagby_all_influencers.json",
        ]
        for alt in alt_paths:
            if os.path.exists(alt):
                json_path = alt
                break

    if not os.path.exists(json_path):
        print(f"Error: JSON file not found at {json_path}")
        sys.exit(1)

    result = await seed_influencers(
        json_path=json_path,
        database_url=args.database_url,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
    )

    print("\n=== Summary ===")
    for key, value in result.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
