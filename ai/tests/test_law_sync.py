import json

import httpx

from ai_agent.config import Settings
from ai_agent.services.rag.law_sync import (
    LAW_NAMES,
    GovernmentLawClient,
    LawSynchronizer,
    sync_configured_laws,
)


def _law_response(*, content: str) -> dict:
    return {
        "법령": {
            "기본정보": {"시행일자": "20260819"},
            "조문": {
                "조문단위": [
                    {
                        "조문여부": "조문",
                        "조문번호": "54",
                        "조문가지번호": "0",
                        "조문제목": "휴게",
                        "조문내용": f"제54조(휴게) {content}",
                        "항": [],
                    }
                ]
            },
        }
    }


def test_sync_replaces_snapshot_only_when_government_content_changes(tmp_path) -> None:
    snapshot_path = tmp_path / "laws.json"
    snapshot_path.write_text(
        json.dumps(
            {
                "snapshot_date": "2026-08-18",
                "articles": [
                    {
                        "law_name": "근로기준법",
                        "article_number": "제54조",
                        "article_title": "휴게",
                        "effective_date": "20260818",
                        "chunk": None,
                        "text": "근로기준법 제54조(휴게) 이전 내용",
                    }
                ],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    client = GovernmentLawClient(
        oc="test-key",
        transport=httpx.MockTransport(
            lambda request: httpx.Response(200, json=_law_response(content="새 내용"))
        ),
    )
    rebuilt = []

    result = LawSynchronizer(
        client=client,
        law_names=("근로기준법",),
        snapshot_path=snapshot_path,
        rebuild_index=lambda: rebuilt.append(True),
    ).sync()

    assert result.updated is True
    assert result.updated_laws == ("근로기준법",)
    assert rebuilt == [True]
    saved = json.loads(snapshot_path.read_text(encoding="utf-8"))
    assert saved["articles"][0]["text"].endswith("새 내용")


def test_sync_adds_a_new_government_article_and_rebuilds_index(tmp_path) -> None:
    snapshot_path = tmp_path / "laws.json"
    snapshot_path.write_text(
        json.dumps(
            {
                "snapshot_date": "2026-08-19",
                "articles": [
                    {
                        "law_name": "근로기준법",
                        "article_number": "제54조",
                        "article_title": "휴게",
                        "effective_date": "20260819",
                        "chunk": None,
                        "source_type": "government_open_api",
                        "text": "근로기준법 제54조(휴게) 기존 내용",
                    }
                ],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    payload = _law_response(content="기존 내용")
    payload["법령"]["조문"]["조문단위"].append(
        {
            "조문여부": "조문",
            "조문번호": "55",
            "조문가지번호": "0",
            "조문제목": "휴일",
            "조문내용": "제55조(휴일) 사용자는 근로자에게 유급 휴일을 주어야 한다.",
            "항": [],
        }
    )
    rebuilt = []
    synchronizer = LawSynchronizer(
        client=GovernmentLawClient(
            oc="test-key",
            transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload)),
        ),
        law_names=("근로기준법",),
        snapshot_path=snapshot_path,
        rebuild_index=lambda: rebuilt.append(True),
    )

    result = synchronizer.sync()

    saved = json.loads(snapshot_path.read_text(encoding="utf-8"))
    assert result.updated is True
    assert {article["article_number"] for article in saved["articles"]} == {"제54조", "제55조"}
    assert rebuilt == [True]


def test_sync_preserves_existing_snapshot_when_any_law_response_is_invalid(tmp_path) -> None:
    snapshot_path = tmp_path / "laws.json"
    original = '{"snapshot_date":"2026-08-18","articles":[{"law_name":"근로기준법"}]}'
    snapshot_path.write_text(original, encoding="utf-8")
    client = GovernmentLawClient(
        oc="test-key",
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json={"법령": {}})),
    )

    result = LawSynchronizer(
        client=client,
        law_names=("근로기준법",),
        snapshot_path=snapshot_path,
        rebuild_index=lambda: None,
    ).sync()

    assert result.updated is False
    assert result.error is not None
    assert snapshot_path.read_text(encoding="utf-8") == original


def test_configured_sync_skips_remote_call_when_open_api_key_is_missing() -> None:
    result = sync_configured_laws(Settings(law_open_api_oc=""))

    assert result.updated is False
    assert result.error == "LAW_OPEN_API_OC가 설정되지 않았습니다"


def test_law_sync_watchlist_matches_the_laws_used_by_rag() -> None:
    assert LAW_NAMES == (
        "근로기준법",
        "최저임금법",
        "외국인근로자의 고용 등에 관한 법률",
        "근로자퇴직급여 보장법",
        "임금채권보장법",
    )


def test_government_client_keeps_paragraphs_in_article_search_text() -> None:
    payload = _law_response(content="")
    payload["법령"]["조문"]["조문단위"][0]["항"] = [
        {"항내용": "① 사용자는 근로시간이 4시간인 경우에는 30분 이상의 휴게시간을 주어야 한다."}
    ]
    client = GovernmentLawClient(
        oc="test-key",
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload)),
    )

    article = client.fetch_articles("근로기준법")[0]

    assert "4시간인 경우" in article["text"]
