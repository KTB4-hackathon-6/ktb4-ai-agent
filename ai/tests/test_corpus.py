"""법령 코퍼스 스냅샷 검증. 네트워크·API 키 없이 돈다."""

import json

from ai_agent.services.rag.corpus import ensure_corpus_exists, load_documents, snapshot_version

EXPECTED_LAWS = {
    "근로기준법",
    "근로기준법 주요 적용 조건",
    "최저임금법",
    "외국인근로자의 고용 등에 관한 법률",
    "외국인근로자의 고용 등에 관한 법률 시행규칙",
    "고용노동부 숙식비·기숙사 관련 기준",
    "4대보험 및 퇴직급여 관련 법령",
    "근로자퇴직급여 보장법",
    "임금채권보장법",
}

def test_corpus_covers_expected_laws() -> None:
    documents = load_documents()

    assert documents
    assert {document.metadata["law_name"] for document in documents} == EXPECTED_LAWS


def test_corpus_contains_only_supported_law_sources() -> None:
    assert {document.metadata["source_type"] for document in load_documents()} == {
        "latest_law",
        "government_open_api",
    }


def test_snapshot_version_includes_content_hash() -> None:
    date, count, content_hash = snapshot_version().split(":")

    assert date == "2026-08-20"
    assert count == "329"
    assert len(content_hash) == 64


def test_document_ids_are_unique() -> None:
    ids = [document.id for document in load_documents()]

    assert len(ids) == len(set(ids))


def test_documents_carry_searchable_text_and_metadata() -> None:
    for document in load_documents():
        # 이동·삭제로 번호만 남은 껍데기 조문이 섞이면 검색 결과에 빈 근거가 올라온다.
        assert len(document.page_content) >= 40, document.id
        # 법령명·조 번호를 본문 머리에 붙여야 조항 지정 질의에도 임베딩이 반응한다.
        assert document.page_content.startswith(document.metadata["law_name"]), document.id
        assert document.metadata["effective_date"]
        # Chroma 메타데이터는 None을 못 받는다.
        assert isinstance(document.metadata["chunk"], str)


def test_empty_runtime_corpus_is_seeded_once_without_overwriting_existing_data(tmp_path) -> None:
    source = tmp_path / "source.json"
    runtime = tmp_path / "runtime" / "laws.json"
    source.write_text('{"snapshot_date":"seed","articles":[]}', encoding="utf-8")

    ensure_corpus_exists(source_path=source, runtime_path=runtime)
    runtime.write_text('{"snapshot_date":"updated","articles":[]}', encoding="utf-8")
    ensure_corpus_exists(source_path=source, runtime_path=runtime)

    assert json.loads(runtime.read_text(encoding="utf-8"))["snapshot_date"] == "updated"
