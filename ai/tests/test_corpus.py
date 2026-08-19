"""법령 코퍼스 스냅샷 검증. 네트워크·API 키 없이 돈다."""

from ai_agent.services.rag.corpus import load_documents

EXPECTED_LAWS = {
    "근로기준법",
    "최저임금법",
    "외국인근로자의 고용 등에 관한 법률",
    "근로자퇴직급여 보장법",
    "임금채권보장법",
}

# docs/외국인근로자_관련법령_정리.md와 services/rules.py가 근거로 삼는 조항들.
# 코퍼스에서 빠지면 agent가 근거를 못 찾는다.
REQUIRED_ARTICLES = [
    ("근로기준법", "제17조"),
    ("근로기준법", "제36조"),
    ("근로기준법", "제43조"),
    ("근로기준법", "제54조"),
    ("근로기준법", "제55조"),
    ("근로기준법", "제56조"),
    ("근로기준법", "제63조"),
    ("최저임금법", "제6조"),
    ("근로자퇴직급여 보장법", "제8조"),
    ("임금채권보장법", "제7조"),
    ("외국인근로자의 고용 등에 관한 법률", "제13조"),
    ("외국인근로자의 고용 등에 관한 법률", "제18조의2"),
    ("외국인근로자의 고용 등에 관한 법률", "제22조"),
    ("외국인근로자의 고용 등에 관한 법률", "제25조"),
]


def test_corpus_covers_expected_laws() -> None:
    documents = load_documents()

    assert documents
    assert {document.metadata["law_name"] for document in documents} == EXPECTED_LAWS


def test_required_articles_are_present() -> None:
    present = {
        (document.metadata["law_name"], document.metadata["article_number"])
        for document in load_documents()
    }

    assert not [article for article in REQUIRED_ARTICLES if article not in present]


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
