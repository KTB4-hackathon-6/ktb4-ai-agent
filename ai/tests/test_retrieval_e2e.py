"""실제 Upstage 임베딩으로 검색 품질을 재는 eval.

    RUN_LIVE_RAG=1 uv run pytest tests/test_retrieval_e2e.py -s

질의 문장 두 종류를 따로 잰다.

- `agent_query`: agent가 search_labor_law에 실제로 넣는 법률 용어 질의. 실사용 경로라
  이 값으로만 통과 여부를 판정한다.
- `user_query`: 사용자가 쓰는 구어체 문장. 조문 원문의 법률 용어와 어휘가 달라 순위가
  크게 떨어진다("월급을 안 줬어요"는 근로기준법 제43조를 10위권 밖으로 민다).
  agent가 질의를 다시 쓰기 때문에 실사용에서는 이 경로를 타지 않지만, 검색이 구어체에
  약하다는 사실 자체는 계속 보이게 남겨둔다.
"""

import json
import os
from pathlib import Path

import pytest

from ai_agent.services.rag.retriever import search

CASES = json.loads(
    (Path(__file__).parents[1] / "evals" / "retrieval_cases.json").read_text(encoding="utf-8")
)
TOP_K = int(os.getenv("AI_EVAL_TOP_K", "3"))
MIN_HIT_RATE = float(os.getenv("AI_EVAL_MIN_HIT_RATE", "0.9"))

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_RAG") != "1",
    reason="RUN_LIVE_RAG=1일 때 실제 임베딩으로 검색 품질을 평가합니다.",
)


def misses(field: str) -> list[str]:
    failed = []
    for case in CASES:
        found = {
            (article.law_name, article.article_number)
            for article in search(case[field], TOP_K)
        }
        if not any(tuple(expected) in found for expected in case["expected"]):
            failed.append(case["name"])
    return failed


def report(field: str) -> float:
    failed = misses(field)
    hit_rate = 1 - len(failed) / len(CASES)
    hits = len(CASES) - len(failed)
    print(f"\n{field} top-{TOP_K} hit rate: {hit_rate:.0%} ({hits}/{len(CASES)})")
    if failed:
        print("  놓친 케이스:", ", ".join(failed))
    return hit_rate


def test_agent_query_hit_rate() -> None:
    """실사용 경로. 이 값이 떨어지면 코퍼스나 임베딩 쪽 회귀다."""
    assert report("agent_query") >= MIN_HIT_RATE


def test_user_query_hit_rate_is_measured() -> None:
    """구어체 하한선. 판정하지 않고 수치만 남긴다."""
    report("user_query")
