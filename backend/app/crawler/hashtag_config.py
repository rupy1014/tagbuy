"""Korean hashtag configuration for influencer discovery"""
from typing import Dict, List
from dataclasses import dataclass


@dataclass
class CategoryHashtags:
    """Hashtags for a category"""
    category: str
    primary: List[str]      # 주요 해시태그 (높은 우선순위)
    secondary: List[str]    # 보조 해시태그
    brand_related: List[str]  # 브랜드/광고 관련


# 국내 인플루언서 발굴을 위한 카테고리별 해시태그
KOREAN_HASHTAGS: Dict[str, CategoryHashtags] = {
    "beauty": CategoryHashtags(
        category="Beauty",
        primary=[
            "뷰티", "메이크업", "화장품", "스킨케어", "뷰티블로거",
            "데일리메이크업", "코스메틱", "뷰티유튜버", "뷰스타그램",
        ],
        secondary=[
            "립스틱", "파운데이션", "아이섀도우", "마스크팩", "클렌징",
            "톤업", "선크림", "쿠션", "로드샵", "올리브영",
        ],
        brand_related=[
            "뷰티리뷰", "화장품추천", "신상템", "겟레디윗미", "grwm",
        ],
    ),

    "fashion": CategoryHashtags(
        category="Fashion",
        primary=[
            "패션", "오오티디", "ootd", "데일리룩", "패션스타그램",
            "코디", "스타일", "룩북", "패피", "패션피플",
        ],
        secondary=[
            "자라", "무신사", "데일리코디", "출근룩", "캐주얼룩",
            "미니멀룩", "빈티지룩", "스트릿패션", "하이패션",
        ],
        brand_related=[
            "패션하울", "옷추천", "쇼핑하울", "신상", "협찬",
        ],
    ),

    "food": CategoryHashtags(
        category="Food & Drink",
        primary=[
            "맛집", "먹스타그램", "맛스타그램", "푸드스타그램", "카페스타그램",
            "음식", "요리", "홈쿡", "레시피", "디저트",
        ],
        secondary=[
            "서울맛집", "강남맛집", "홍대맛집", "브런치", "파스타",
            "한식", "일식", "중식", "베이킹", "커피",
        ],
        brand_related=[
            "맛집추천", "카페추천", "먹방", "음식리뷰", "배달음식",
        ],
    ),

    "travel": CategoryHashtags(
        category="Travel",
        primary=[
            "여행", "여행스타그램", "국내여행", "해외여행", "trip",
            "travel", "휴가", "여행에미치다", "여행기록",
        ],
        secondary=[
            "제주도", "부산여행", "강원도", "경주", "전주",
            "호캉스", "글램핑", "캠핑", "힐링", "바다",
        ],
        brand_related=[
            "여행추천", "숙소추천", "호텔", "리조트", "펜션",
        ],
    ),

    "lifestyle": CategoryHashtags(
        category="Lifestyle",
        primary=[
            "일상", "데일리", "라이프스타일", "소통", "인스타그램",
            "daily", "일상스타그램", "셀피", "셀카",
        ],
        secondary=[
            "집순이", "홈카페", "인테리어", "집꾸미기", "미니멀라이프",
            "자취생", "자취방", "신혼집", "루틴", "모닝루틴",
        ],
        brand_related=[
            "일상공유", "광고", "협찬", "리뷰", "체험단",
        ],
    ),

    "fitness": CategoryHashtags(
        category="Fitness",
        primary=[
            "운동", "헬스", "피트니스", "헬스타그램", "운동스타그램",
            "fitness", "workout", "gym", "홈트", "필라테스",
        ],
        secondary=[
            "다이어트", "바디프로필", "근육", "헬린이", "오운완",
            "눈바디", "식단", "단백질", "프로틴", "크로스핏",
        ],
        brand_related=[
            "운동복", "헬스장", "PT", "보충제", "운동기구",
        ],
    ),

    "parenting": CategoryHashtags(
        category="Parenting",
        primary=[
            "육아", "육아스타그램", "맘스타그램", "아기", "아기스타그램",
            "육아일기", "엄마", "아빠", "baby", "신생아",
        ],
        secondary=[
            "육아맘", "워킹맘", "돌아기", "이유식", "아기옷",
            "출산", "임신", "태교", "어린이집", "유아",
        ],
        brand_related=[
            "유아용품", "아기용품", "육아템", "육아추천", "아기장난감",
        ],
    ),

    "pet": CategoryHashtags(
        category="Pets",
        primary=[
            "반려동물", "펫스타그램", "강아지", "고양이", "멍스타그램",
            "냥스타그램", "dog", "cat", "puppy", "애견",
        ],
        secondary=[
            "강아지일상", "고양이일상", "댕댕이", "냥이", "펫",
            "동물", "산책", "애묘", "포메라니안", "말티즈",
        ],
        brand_related=[
            "펫푸드", "강아지간식", "고양이간식", "펫용품", "애견용품",
        ],
    ),

    "tech": CategoryHashtags(
        category="Technology",
        primary=[
            "테크", "전자기기", "가젯", "리뷰", "언박싱",
            "tech", "gadget", "애플", "삼성", "스마트폰",
        ],
        secondary=[
            "아이폰", "갤럭시", "맥북", "아이패드", "에어팟",
            "노트북", "카메라", "게임", "pc", "키보드",
        ],
        brand_related=[
            "신제품", "제품리뷰", "개봉기", "비교", "추천",
        ],
    ),
}

# 발굴 우선순위 (높을수록 먼저 크롤링)
CATEGORY_PRIORITY = {
    "beauty": 10,
    "fashion": 10,
    "food": 9,
    "lifestyle": 8,
    "fitness": 7,
    "travel": 7,
    "parenting": 6,
    "pet": 6,
    "tech": 5,
}

# 팔로워 수 범위별 발굴 설정
FOLLOWER_RANGES = {
    "nano": {"min": 1_000, "max": 10_000, "priority": 10},
    "micro": {"min": 10_000, "max": 100_000, "priority": 9},
    "macro": {"min": 100_000, "max": 1_000_000, "priority": 5},
    "mega": {"min": 1_000_000, "max": None, "priority": 3},
}

# 최소 기준 (이 기준 미달 시 저장하지 않음)
MINIMUM_REQUIREMENTS = {
    "follower_count": 1_000,
    "media_count": 10,
    "engagement_rate": 0.5,  # 0.5% 이상
}


def get_all_primary_hashtags() -> List[str]:
    """모든 카테고리의 주요 해시태그 반환"""
    hashtags = []
    for config in KOREAN_HASHTAGS.values():
        hashtags.extend(config.primary)
    return list(set(hashtags))


def get_category_hashtags(category: str) -> CategoryHashtags:
    """카테고리별 해시태그 설정 반환"""
    return KOREAN_HASHTAGS.get(category)


def get_hashtags_by_priority() -> List[tuple]:
    """우선순위 순으로 정렬된 (카테고리, 해시태그 리스트) 반환"""
    sorted_categories = sorted(
        CATEGORY_PRIORITY.items(),
        key=lambda x: x[1],
        reverse=True
    )
    result = []
    for category, _ in sorted_categories:
        if category in KOREAN_HASHTAGS:
            result.append((category, KOREAN_HASHTAGS[category]))
    return result
