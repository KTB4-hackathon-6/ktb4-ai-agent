"""국가법령정보센터에서 법령 조문을 받아 src/ai_agent/data/laws.json으로 고정한다.

런타임 경로가 아니다. 법 개정으로 코퍼스를 갱신할 때만 재실행한다.

    uv run python scripts/build_law_corpus.py

조문 원문을 사람이 옮겨 적거나 모델이 기억으로 생성하면 인용이 틀릴 수 있어서,
원문은 반드시 이 스크립트로 받아 고정한다. 서비스는 생성된 JSON만 읽는다.
"""

import json
import re
from datetime import date
from pathlib import Path

import httpx

API_URL = "https://www.law.go.kr/DRF/lawService.do"
OC = "test"  # 국가법령정보센터가 공개한 공용 조회 계정

LAW_NAMES = (
    "근로기준법",
    "최저임금법",
    "외국인근로자의 고용 등에 관한 법률",
    "근로자퇴직급여 보장법",
    "임금채권보장법",
)

OUTPUT_PATH = Path(__file__).resolve().parents[1] / "src" / "ai_agent" / "data" / "laws.json"

# 조문 하나가 이 길이를 넘으면 항 단위로 쪼갠다. solar 임베딩 컨텍스트는 4k라
# 여유가 있지만, 한 청크에 여러 주제가 섞이면 검색 정확도가 떨어진다.
MAX_CHUNK_CHARS = 1500

# 조문내용에서 맨 앞 "제43조(임금 지급)" 머리말을 떼어낸 나머지가 실제 본문이다.
_ARTICLE_HEAD = re.compile(r"^제\d+조(의\d+)?(\([^)]*\))?")


def fetch(law_name: str) -> dict:
    response = httpx.get(
        API_URL,
        params={"OC": OC, "target": "law", "type": "JSON", "LM": law_name},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["법령"]


def article_number(unit: dict) -> str:
    branch = str(unit.get("조문가지번호") or "").strip()
    number = f"제{str(unit['조문번호']).strip()}조"
    return f"{number}의{branch}" if branch and branch != "0" else number


def paragraph_texts(unit: dict) -> list[str]:
    """항 단위 텍스트. 각 항에 딸린 호까지 붙인다."""
    paragraphs = unit.get("항") or []
    if isinstance(paragraphs, dict):
        paragraphs = [paragraphs]

    texts = []
    for paragraph in paragraphs:
        lines = [(paragraph.get("항내용") or "").strip()]
        items = paragraph.get("호") or []
        if isinstance(items, dict):
            items = [items]
        for item in items:
            lines.append((item.get("호내용") or "").strip())
            subitems = item.get("목") or []
            if isinstance(subitems, dict):
                subitems = [subitems]
            for subitem in subitems:
                content = subitem.get("목내용")
                lines.extend(
                    line.strip() for line in (content if isinstance(content, list) else [content])
                )
        texts.append("\n".join(line for line in lines if line))
    return [text for text in texts if text]


def to_articles(law_name: str, effective_date: str, unit: dict) -> list[dict]:
    body = (unit.get("조문내용") or "").strip()
    paragraphs = paragraph_texts(unit)
    remainder = _ARTICLE_HEAD.sub("", body).strip()
    # 항도 없고 머리말 말고는 남는 게 없으면 검색할 내용이 없는 조문이다.
    # "제35조 삭제 <2019.1.15>"처럼 폐지된 조문과, 다른 조로 이동해 번호만 남은 stub이 여기 걸린다.
    if not paragraphs and (not remainder or remainder.startswith("삭제")):
        return []

    number = article_number(unit)
    title = (unit.get("조문제목") or "").strip()
    # 법령명과 조 번호를 본문 앞에 붙여야 "근로기준법 43조" 같은
    # 조항 지정 질의에도 임베딩이 반응한다.
    header = f"{law_name} {body}" if body.startswith("제") else f"{law_name} {number}"
    full_text = "\n".join([header, *paragraphs]) if paragraphs else header

    common = {
        "law_name": law_name,
        "article_number": number,
        "article_title": title,
        "effective_date": effective_date,
    }
    if len(full_text) <= MAX_CHUNK_CHARS or not paragraphs:
        return [{**common, "chunk": None, "text": full_text}]

    return [
        {**common, "chunk": f"제{index}항", "text": f"{header}\n{paragraph}"}
        for index, paragraph in enumerate(paragraphs, start=1)
    ]


def build() -> dict:
    articles = []
    for law_name in LAW_NAMES:
        law = fetch(law_name)
        effective_date = str(law["기본정보"]["시행일자"]).strip()
        units = law["조문"]["조문단위"]
        if isinstance(units, dict):
            units = [units]

        collected = [
            article
            for unit in units
            if unit.get("조문여부") == "조문"  # '전문'은 장·절 제목이라 검색 대상이 아니다
            for article in to_articles(law_name, effective_date, unit)
        ]
        print(f"{law_name}: {len(collected)}개 (시행 {effective_date})")
        articles.extend(collected)
    return {"snapshot_date": date.today().isoformat(), "articles": articles}


def main() -> None:
    corpus = build()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(corpus, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print(f"총 {len(corpus['articles'])}개 -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
