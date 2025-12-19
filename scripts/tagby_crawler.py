"""
TagBy.io 인플루언서 크롤러

API 기반으로 인플루언서 리스트를 크롤링합니다.
"""

import requests
import json
import time
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class Influencer:
    """인플루언서 데이터 모델"""
    username: str
    platform: str
    account_type: str  # 개인/프로페셔널
    categories: List[str]
    gender: Optional[str]
    age_group: Optional[str]
    follower_count: int
    avg_reach: int
    influence_score: int
    ad_rate: float  # 광고지수 (%)
    instagram_url: str
    raw_data: Dict[str, Any]  # 원본 API 응답


class TagbyCrawler:
    """TagBy.io API 크롤러"""

    BASE_URL = "https://api.tagby.io"
    ASYNC_URL = "https://async.tagby.io"

    def __init__(self, email: str, password: str):
        self.email = email
        self.password = password
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None

        # 공통 헤더 설정
        self.session.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Origin": "https://www.tagby.io",
            "Referer": "https://www.tagby.io/",
        })

    def login(self) -> bool:
        """로그인 및 토큰 획득"""
        url = f"{self.BASE_URL}/auth/login/biz/"

        payload = {
            "email": self.email,
            "password": self.password
        }

        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()

            data = response.json()
            self.access_token = data["access_token"]["token"]
            self.refresh_token = data["refresh_token"]["token"]

            # 인증 헤더 설정
            self.session.headers["Authorization"] = f"Token {self.access_token}"

            # 쿠키 확인
            print(f"✅ 로그인 성공: {self.email}")
            print(f"   토큰 만료: {data['access_token']['expires_at']}")
            print(f"   쿠키: {dict(self.session.cookies)}")
            return True

        except requests.RequestException as e:
            print(f"❌ 로그인 실패: {e}")
            return False

    def get_me(self) -> Optional[Dict]:
        """현재 사용자 정보 조회"""
        url = f"{self.BASE_URL}/biz/v2/me/"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()["data"]
        except requests.RequestException as e:
            print(f"❌ 사용자 정보 조회 실패: {e}")
            return None

    def search_influencers_v1(
        self,
        page: int = 1,
        service: Optional[str] = None,  # INSTA_BIZ, INSTA_BASIC, YOUTUBE, BLOG
        ordering: str = "-follower_count",  # -follower_count, -isi, -avg_reach
        follower_min: Optional[int] = None,
        follower_max: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        인플루언서 검색 (api.tagby.io/sns/ API)

        Args:
            page: 페이지 번호 (1부터 시작)
            service: 플랫폼 필터 (INSTA_BIZ, INSTA_BASIC, YOUTUBE, BLOG)
            ordering: 정렬 기준 (-follower_count, -isi, follower_count 등)
            follower_min: 최소 팔로워
            follower_max: 최대 팔로워
        """
        url = f"{self.BASE_URL}/sns/"

        params = {
            "page": page,
            "ordering": ordering,
        }

        # 선택적 필터 추가
        if service:
            params["service"] = service
        if follower_min is not None:
            params["follower_count__gte"] = follower_min
        if follower_max is not None:
            params["follower_count__lte"] = follower_max

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            # API 응답 형식 변환
            return {
                "items": data.get("results", []),
                "total": data.get("count", 0),
                "next": data.get("next"),
                "previous": data.get("previous"),
            }

        except requests.RequestException as e:
            print(f"❌ 인플루언서 검색 실패: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Status: {e.response.status_code}")
                print(f"   Response: {e.response.text[:500]}")
            return {"items": [], "total": 0}

    def search_influencers(
        self,
        page: int = 1,
        size: int = 20,
        services: List[str] = None,
        sort_by: str = "isi",  # isi: 영향력지수
        sort_order: str = "desc",
        follower_min: Optional[int] = None,
        follower_max: Optional[int] = None,
        birth_min: Optional[str] = None,  # 생년월일 최소 (YYYY-MM-DD)
        birth_max: Optional[str] = None,  # 생년월일 최대 (YYYY-MM-DD)
        categories: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        인플루언서 검색 (async.tagby.io API v2)

        Args:
            page: 페이지 번호 (1부터 시작)
            size: 페이지당 결과 수
            services: 플랫폼 ["INSTA_BIZ", "INSTA_BASIC"]
            sort_by: 정렬 기준 (isi: 영향력지수)
            sort_order: 정렬 순서 (desc, asc)
            follower_min: 최소 팔로워
            follower_max: 최대 팔로워
            birth_min: 생년월일 최소 (예: 2005-12-17)
            birth_max: 생년월일 최대 (예: 2010-12-17)
            categories: 카테고리 필터
        """
        url = f"{self.ASYNC_URL}/sns/search/sns-info"

        # 기본 서비스 설정
        if services is None:
            services = ["INSTA_BIZ", "INSTA_BASIC"]

        # 쿼리 파라미터 구성 (리스트 파라미터는 별도 처리)
        params = []
        for svc in services:
            params.append(("services", svc))
        params.append(("states", "ACTIVE"))
        params.append(("states", "RELOGIN"))
        params.append(("only_naver_influencer", "false"))
        params.append(("sort_by", sort_by))
        params.append(("sort_order", sort_order))
        params.append(("page", str(page)))
        params.append(("size", str(size)))

        # 팔로워 범위
        if follower_min is not None or follower_max is not None:
            f_min = follower_min if follower_min is not None else 0
            f_max = follower_max if follower_max is not None else 999999999
            params.append(("follower_count_ranges", f"{f_min},{f_max}"))

        # 생년월일 범위
        if birth_min or birth_max:
            b_min = birth_min or "1900-01-01"
            b_max = birth_max or "2020-12-31"
            params.append(("birth_ranges", f"{b_min},{b_max}"))

        # 카테고리
        if categories:
            for cat in categories:
                params.append(("categories", cat))

        # async.tagby.io 전용 헤더 설정
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "x-api-version": "v2",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://tagby.io/",
        }

        try:
            response = requests.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

            # 응답 구조 변환: {code, msg, data: {count, size, page, snsList}}
            if data.get("code") == 0 and "data" in data:
                return {
                    "items": data["data"].get("snsList", []),
                    "total": data["data"].get("count", 0),
                    "page": data["data"].get("page", 1),
                    "size": data["data"].get("size", 20),
                }
            return data

        except requests.RequestException as e:
            print(f"❌ 인플루언서 검색 실패: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Status: {e.response.status_code}")
                print(f"   Response: {e.response.text[:500]}")
            return {"items": [], "total": 0}

    def crawl_all_influencers_v1(
        self,
        max_pages: int = 10,
        delay: float = 0.5,
        **filters
    ) -> List[Dict]:
        """
        전체 인플루언서 크롤링 (api.tagby.io/sns/ API)

        Args:
            max_pages: 최대 크롤링 페이지 수
            delay: 요청 간 딜레이 (초)
            **filters: 검색 필터 (search_influencers_v1 파라미터)

        Returns:
            인플루언서 목록
        """
        all_influencers = []

        for page in range(1, max_pages + 1):
            print(f"\n📄 페이지 {page}/{max_pages} 새로고침 중...")

            result = self.search_influencers_v1(page=page, **filters)

            items = result.get("items", [])
            total = result.get("total", 0)

            if not items:
                print(f"   더 이상 결과가 없습니다.")
                break

            all_influencers.extend(items)
            print(f"   ✅ {len(items)}명 수집 (총 {len(all_influencers)}/{total}명)")

            # 마지막 페이지 확인
            if result.get("next") is None:
                print(f"\n🎉 전체 크롤링 완료!")
                break

            # Rate limiting
            if page < max_pages:
                time.sleep(delay)

        return all_influencers

    def crawl_all_influencers(
        self,
        max_pages: int = 10,
        size: int = 20,
        delay: float = 1.0,
        **filters
    ) -> List[Dict]:
        """
        전체 인플루언서 크롤링 (async.tagby.io API)

        Args:
            max_pages: 최대 크롤링 페이지 수
            size: 페이지당 결과 수
            delay: 요청 간 딜레이 (초)
            **filters: 검색 필터 (search_influencers 파라미터)

        Returns:
            인플루언서 목록
        """
        all_influencers = []

        for page in range(1, max_pages + 1):
            print(f"\n📄 페이지 {page}/{max_pages} 새로고침 중...")

            result = self.search_influencers(page=page, size=size, **filters)

            items = result.get("items", [])
            total = result.get("total", 0)

            if not items:
                print(f"   더 이상 결과가 없습니다.")
                break

            all_influencers.extend(items)
            print(f"   ✅ {len(items)}명 수집 (총 {len(all_influencers)}/{total}명)")

            # 마지막 페이지 확인
            if len(all_influencers) >= total:
                print(f"\n🎉 전체 크롤링 완료!")
                break

            # Rate limiting
            if page < max_pages:
                time.sleep(delay)

        return all_influencers

    def parse_influencer(self, raw: Dict) -> Influencer:
        """API 응답을 Influencer 객체로 파싱"""

        # 팔로워 수 파싱 (예: "105.4만" -> 1054000)
        def parse_count(value) -> int:
            if isinstance(value, int):
                return value
            if isinstance(value, str):
                value = value.replace(",", "")
                if "만" in value:
                    return int(float(value.replace("만", "")) * 10000)
                return int(value) if value.isdigit() else 0
            return 0

        username = raw.get("username", raw.get("sns_id", ""))

        return Influencer(
            username=username,
            platform="instagram",
            account_type=raw.get("account_type", "unknown"),
            categories=raw.get("categories", []),
            gender=raw.get("gender"),
            age_group=raw.get("age_group"),
            follower_count=parse_count(raw.get("follower_count", 0)),
            avg_reach=parse_count(raw.get("avg_reach", 0)),
            influence_score=parse_count(raw.get("isi", raw.get("influence_score", 0))),
            ad_rate=float(raw.get("ad_rate", 0)),
            instagram_url=f"https://www.instagram.com/{username}/",
            raw_data=raw
        )

    def save_to_json(self, influencers: List[Dict], filename: str = None):
        """결과를 JSON 파일로 저장"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"tagby_influencers_{timestamp}.json"

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(influencers, f, ensure_ascii=False, indent=2)

        print(f"\n💾 저장 완료: {filename} ({len(influencers)}명)")
        return filename


def main_deep_pagination():
    """깊은 페이징으로 최대한 많은 인플루언서 수집"""

    # 크롤러 초기화
    crawler = TagbyCrawler(
        email="rupy1008@gmail.com",
        password="KM1178km!@"
    )

    if not crawler.login():
        return

    # 기존 데이터 로드
    try:
        with open("tagby_instagram_influencers.json", "r", encoding="utf-8") as f:
            existing = json.load(f)
        all_influencers = {inf.get("username"): inf for inf in existing}
        print(f"📂 기존 데이터: {len(all_influencers)}명")
    except:
        all_influencers = {}
        print("📂 기존 데이터 없음")

    total_requests = 0
    initial_count = len(all_influencers)

    print("\n" + "="*60)
    print("🚀 깊은 페이징으로 인플루언서 수집")
    print("="*60)

    # 1. 필터 없이 전체 페이징 (각 정렬별 최대 100페이지)
    print("\n🔹 1단계: 전체 데이터 깊은 페이징")
    print("-" * 50)

    sort_options = [
        ("isi", "desc"),
        ("isi", "asc"),
        ("follower_count", "desc"),
        ("follower_count", "asc"),
        ("avg_reach", "desc"),
        ("avg_reach", "asc"),
        ("ad_rate", "desc"),
        ("ad_rate", "asc"),
    ]

    for sort_by, sort_order in sort_options:
        print(f"\n📊 정렬: {sort_by} {sort_order}")
        consecutive_no_new = 0

        for page in range(1, 101):  # 최대 100페이지
            result = crawler.search_influencers(
                page=page,
                size=50,
                sort_by=sort_by,
                sort_order=sort_order,
            )

            items = result.get("items", [])
            total = result.get("total", 0)
            total_requests += 1

            if not items:
                print(f"   페이지 {page}: 데이터 없음 (종료)")
                break

            new_count = 0
            for inf in items:
                username = inf.get("username")
                if username and username not in all_influencers:
                    all_influencers[username] = inf
                    new_count += 1

            if new_count > 0:
                print(f"   페이지 {page}: +{new_count}명 (총 {len(all_influencers)}명)")
                consecutive_no_new = 0
            else:
                consecutive_no_new += 1

            # 3페이지 연속 신규 없으면 다음 정렬로
            if consecutive_no_new >= 3:
                print(f"   3페이지 연속 신규 없음, 다음 정렬로")
                break

            if len(items) < 50:
                print(f"   마지막 페이지 (페이지 {page})")
                break

            time.sleep(0.1)

    # 2. 팔로워 범위별 세분화 페이징
    print("\n\n🔹 2단계: 팔로워 범위별 세분화")
    print("-" * 50)

    follower_ranges = [
        (0, 500), (500, 1000), (1000, 2000), (2000, 3000), (3000, 5000),
        (5000, 7000), (7000, 10000), (10000, 15000), (15000, 20000),
        (20000, 30000), (30000, 40000), (40000, 50000), (50000, 70000),
        (70000, 100000), (100000, 150000), (150000, 200000), (200000, 300000),
        (300000, 400000), (400000, 500000), (500000, 700000), (700000, 1000000),
        (1000000, 2000000), (2000000, 10000000),
    ]

    for f_min, f_max in follower_ranges:
        if f_max >= 10000:
            label = f"{f_min//1000}K~{f_max//1000}K"
        else:
            label = f"{f_min}~{f_max}"

        print(f"\n📊 팔로워 {label}")

        for page in range(1, 51):  # 최대 50페이지
            result = crawler.search_influencers(
                page=page,
                size=50,
                sort_by="isi",
                sort_order="desc",
                follower_min=f_min,
                follower_max=f_max,
            )

            items = result.get("items", [])
            total_requests += 1

            if not items:
                break

            new_count = 0
            for inf in items:
                username = inf.get("username")
                if username and username not in all_influencers:
                    all_influencers[username] = inf
                    new_count += 1

            if new_count > 0:
                print(f"   페이지 {page}: +{new_count}명 (총 {len(all_influencers)}명)")

            if len(items) < 50 or new_count == 0:
                break

            time.sleep(0.1)

    # 3. 서비스 타입별 깊은 페이징
    print("\n\n🔹 3단계: 서비스 타입별 깊은 페이징")
    print("-" * 50)

    for services, label in [(["INSTA_BIZ"], "INSTA_BIZ"), (["INSTA_BASIC"], "INSTA_BASIC")]:
        print(f"\n📊 {label}")
        for page in range(1, 101):
            result = crawler.search_influencers(
                page=page,
                size=50,
                services=services,
                sort_by="isi",
                sort_order="desc",
            )

            items = result.get("items", [])
            total_requests += 1

            if not items:
                break

            new_count = 0
            for inf in items:
                username = inf.get("username")
                if username and username not in all_influencers:
                    all_influencers[username] = inf
                    new_count += 1

            if new_count > 0:
                print(f"   페이지 {page}: +{new_count}명 (총 {len(all_influencers)}명)")

            if len(items) < 50:
                break

            time.sleep(0.1)

    # 결과 출력 및 저장
    print(f"\n\n" + "="*60)
    print(f"📊 최종 결과")
    print("="*60)
    print(f"총 API 요청: {total_requests}회")
    print(f"기존 데이터: {initial_count}명")
    print(f"최종 수집: {len(all_influencers)}명")
    print(f"신규 추가: +{len(all_influencers) - initial_count}명")

    # 정렬 후 저장
    influencer_list = list(all_influencers.values())
    influencer_list.sort(key=lambda x: x.get("isi") or 0, reverse=True)

    with open("tagby_instagram_influencers.json", "w", encoding="utf-8") as f:
        json.dump(influencer_list, f, ensure_ascii=False, indent=2)

    print(f"\n💾 저장 완료: tagby_instagram_influencers.json")

    # 통계
    print(f"\n📈 서비스별:")
    services_stat = {}
    for inf in influencer_list:
        svc = inf.get("service", "Unknown")
        services_stat[svc] = services_stat.get(svc, 0) + 1
    for svc, count in sorted(services_stat.items(), key=lambda x: -x[1]):
        print(f"   {svc}: {count}명")

    print(f"\n📊 팔로워 구간별:")
    follower_stats = {"~1만": 0, "1만~5만": 0, "5만~10만": 0, "10만~50만": 0, "50만+": 0}
    for inf in influencer_list:
        fc = inf.get("follower_count") or 0
        if fc < 10000:
            follower_stats["~1만"] += 1
        elif fc < 50000:
            follower_stats["1만~5만"] += 1
        elif fc < 100000:
            follower_stats["5만~10만"] += 1
        elif fc < 500000:
            follower_stats["10만~50만"] += 1
        else:
            follower_stats["50만+"] += 1
    for label, count in follower_stats.items():
        print(f"   {label}: {count}명")


def main():
    """메인 실행 함수"""

    # 크롤러 초기화
    crawler = TagbyCrawler(
        email="rupy1008@gmail.com",
        password="KM1178km!@"
    )

    # 로그인
    if not crawler.login():
        return

    # 사용자 정보 확인
    me = crawler.get_me()
    if me:
        print(f"\n👤 로그인 사용자: {me.get('name')} ({me.get('company_name')})")

    # 다양한 필터 조합으로 크롤링
    print("\n" + "="*60)
    print("🚀 확장 필터로 인플루언서 크롤링")
    print("="*60)

    all_influencers = {}  # username을 키로 사용해서 중복 제거

    # 팔로워 범위 (더 세분화)
    follower_ranges = [
        (0, 5000),          # ~5천
        (5000, 10000),      # 5천~1만
        (10000, 30000),     # 1만~3만
        (30000, 50000),     # 3만~5만
        (50000, 100000),    # 5만~10만
        (100000, 300000),   # 10만~30만
        (300000, 500000),   # 30만~50만
        (500000, 1000000),  # 50만~100만
        (1000000, 9999999), # 100만 이상
    ]

    # 정렬 옵션
    sort_options = [
        ("isi", "desc"),           # ISI 높은순
        ("isi", "asc"),            # ISI 낮은순
        ("follower_count", "desc"), # 팔로워 많은순
        ("follower_count", "asc"),  # 팔로워 적은순
        ("avg_reach", "desc"),     # 평균도달 높은순
        ("avg_reach", "asc"),      # 평균도달 낮은순
    ]

    # 생년월일 범위 (세대별)
    birth_ranges = [
        ("1970-01-01", "1979-12-31", "70년대"),
        ("1980-01-01", "1989-12-31", "80년대"),
        ("1990-01-01", "1994-12-31", "90년대 초"),
        ("1995-01-01", "1999-12-31", "90년대 후반"),
        ("2000-01-01", "2004-12-31", "00년대 초"),
        ("2005-01-01", "2010-12-31", "05년 이후"),
    ]

    # 서비스 타입 (개별)
    service_types = [
        (["INSTA_BIZ"], "Instagram Business"),
        (["INSTA_BASIC"], "Instagram Basic"),
    ]

    total_requests = 0

    # 1단계: 기본 팔로워 + 정렬 조합
    print("\n\n🔹 1단계: 팔로워 범위 + 정렬 조합")
    print("-" * 50)
    for f_min, f_max in follower_ranges:
        if f_max >= 10000:
            range_label = f"{f_min//10000}만~{f_max//10000}만" if f_min >= 10000 else f"~{f_max//10000}만"
        else:
            range_label = f"{f_min}~{f_max}"

        for sort_by, sort_order in sort_options:
            print(f"\n📊 팔로워 {range_label} | 정렬: {sort_by} {sort_order}")

            for page in range(1, 6):  # 최대 5페이지
                result = crawler.search_influencers(
                    page=page,
                    size=50,  # 페이지당 50개로 증가
                    services=["INSTA_BIZ", "INSTA_BASIC"],
                    sort_by=sort_by,
                    sort_order=sort_order,
                    follower_min=f_min,
                    follower_max=f_max,
                )

                items = result.get("items", [])
                total_requests += 1

                if not items:
                    break

                new_count = 0
                for inf in items:
                    username = inf.get("username")
                    if username and username not in all_influencers:
                        all_influencers[username] = inf
                        new_count += 1

                if new_count > 0:
                    print(f"   페이지 {page}: +{new_count}명 (총 {len(all_influencers)}명)")

                if len(items) < 50 or new_count == 0:
                    break

                time.sleep(0.15)

    # 2단계: 생년월일 범위별
    print("\n\n🔹 2단계: 세대별 크롤링")
    print("-" * 50)
    for b_min, b_max, label in birth_ranges:
        for sort_by, sort_order in [("isi", "desc"), ("follower_count", "desc")]:
            print(f"\n📊 세대: {label} | 정렬: {sort_by} {sort_order}")

            for page in range(1, 6):
                result = crawler.search_influencers(
                    page=page,
                    size=50,
                    services=["INSTA_BIZ", "INSTA_BASIC"],
                    sort_by=sort_by,
                    sort_order=sort_order,
                    birth_min=b_min,
                    birth_max=b_max,
                )

                items = result.get("items", [])
                total_requests += 1

                if not items:
                    break

                new_count = 0
                for inf in items:
                    username = inf.get("username")
                    if username and username not in all_influencers:
                        all_influencers[username] = inf
                        new_count += 1

                if new_count > 0:
                    print(f"   페이지 {page}: +{new_count}명 (총 {len(all_influencers)}명)")

                if len(items) < 50 or new_count == 0:
                    break

                time.sleep(0.15)

    # 3단계: 서비스 타입별 + 팔로워 조합
    print("\n\n🔹 3단계: 서비스 타입별 크롤링")
    print("-" * 50)
    for services, svc_label in service_types:
        for f_min, f_max in follower_ranges[:5]:  # 팔로워 낮은 구간 집중
            if f_max >= 10000:
                range_label = f"{f_min//10000}만~{f_max//10000}만" if f_min >= 10000 else f"~{f_max//10000}만"
            else:
                range_label = f"{f_min}~{f_max}"

            print(f"\n📊 {svc_label} | 팔로워 {range_label}")

            for page in range(1, 6):
                result = crawler.search_influencers(
                    page=page,
                    size=50,
                    services=services,
                    sort_by="isi",
                    sort_order="desc",
                    follower_min=f_min,
                    follower_max=f_max,
                )

                items = result.get("items", [])
                total_requests += 1

                if not items:
                    break

                new_count = 0
                for inf in items:
                    username = inf.get("username")
                    if username and username not in all_influencers:
                        all_influencers[username] = inf
                        new_count += 1

                if new_count > 0:
                    print(f"   페이지 {page}: +{new_count}명 (총 {len(all_influencers)}명)")

                if len(items) < 50 or new_count == 0:
                    break

                time.sleep(0.15)

    # 4단계: 광고지수 정렬
    print("\n\n🔹 4단계: 광고지수(ad_rate) 정렬")
    print("-" * 50)
    for sort_order in ["desc", "asc"]:
        print(f"\n📊 광고지수 {sort_order}")
        for page in range(1, 11):
            result = crawler.search_influencers(
                page=page,
                size=50,
                services=["INSTA_BIZ", "INSTA_BASIC"],
                sort_by="ad_rate",
                sort_order=sort_order,
            )

            items = result.get("items", [])
            total_requests += 1

            if not items:
                break

            new_count = 0
            for inf in items:
                username = inf.get("username")
                if username and username not in all_influencers:
                    all_influencers[username] = inf
                    new_count += 1

            if new_count > 0:
                print(f"   페이지 {page}: +{new_count}명 (총 {len(all_influencers)}명)")

            if len(items) < 50 or new_count == 0:
                break

            time.sleep(0.15)

    print(f"\n\n총 API 요청: {total_requests}회")

    print(f"\n" + "="*60)
    print(f"📊 총 수집: {len(all_influencers)}명 (중복 제거됨)")
    print("="*60)

    # 결과를 리스트로 변환하고 ISI 순으로 정렬
    influencer_list = list(all_influencers.values())
    influencer_list.sort(key=lambda x: x.get("isi") or 0, reverse=True)

    # 상위 30명 출력
    print(f"\n📋 인플루언서 상위 30명 (ISI 순):")
    print("-" * 130)
    print(f"{'#':>3} | {'Username':<25} | {'Service':<12} | {'Followers':>12} | {'Avg Reach':>12} | {'ISI':>10} | {'Ad Rate':>8} | {'Category':<15}")
    print("-" * 130)

    for i, inf in enumerate(influencer_list[:30], 1):
        username = inf.get("username", "N/A")
        service = inf.get("service", "N/A")
        follower = inf.get("follower_count") or 0
        avg_reach = inf.get("avg_reach") or 0
        isi = inf.get("isi") or 0
        ad_rate = inf.get("ad_rate") or 0
        category = inf.get("sns_label", {}).get("category", [])
        cat_str = "/".join(category[:2]) if category else "-"
        print(f"{i:>3} | @{username:<24} | {service:<12} | {follower:>12,} | {avg_reach:>12,} | {isi:>10.0f} | {ad_rate:>7}% | {cat_str:<15}")

    print("-" * 130)

    # 통계
    print(f"\n📈 통계:")
    services = {}
    for inf in influencer_list:
        svc = inf.get("service", "Unknown")
        services[svc] = services.get(svc, 0) + 1
    for svc, count in sorted(services.items(), key=lambda x: -x[1]):
        print(f"   {svc}: {count}명")

    # 팔로워 구간별 통계
    print(f"\n📊 팔로워 구간별:")
    follower_stats = {"~1만": 0, "1만~5만": 0, "5만~10만": 0, "10만~50만": 0, "50만+": 0}
    for inf in influencer_list:
        fc = inf.get("follower_count") or 0
        if fc < 10000:
            follower_stats["~1만"] += 1
        elif fc < 50000:
            follower_stats["1만~5만"] += 1
        elif fc < 100000:
            follower_stats["5만~10만"] += 1
        elif fc < 500000:
            follower_stats["10만~50만"] += 1
        else:
            follower_stats["50만+"] += 1
    for label, count in follower_stats.items():
        print(f"   {label}: {count}명")

    # 결과 저장
    crawler.save_to_json(influencer_list, "tagby_instagram_influencers.json")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "deep":
        main_deep_pagination()
    else:
        main_deep_pagination()  # 기본으로 깊은 페이징 사용
