"""법령 조문 벡터 인덱스(Chroma + Upstage solar 임베딩).

UpstageEmbeddings는 embed_documents()면 `-passage`, embed_query()면 `-query`
모델을 자동으로 붙인다. Chroma가 색인할 때 전자, 검색할 때 후자를 부르므로
질의용/문서용 모델이 별도 처리 없이 맞물린다.
"""

import threading
from functools import lru_cache

from langchain_chroma import Chroma
from langchain_upstage import UpstageEmbeddings

from ai_agent.config import get_settings
from ai_agent.services.rag.corpus import load_documents, snapshot_version

COLLECTION_NAME = "labor_law"
VERSION_FILE_NAME = "corpus_version"

_INIT_LOCK = threading.Lock()


def get_vector_store() -> Chroma:
    """인덱스를 연다. 초기화는 한 번만 일어난다.

    chromadb 클라이언트 초기화는 스레드 안전하지 않다. lru_cache는 캐시 자체는
    지켜주지만 함수 본문의 동시 실행은 막지 못해서, 서버 기동 직후 agent가 도구를
    동시에 호출하면 여러 스레드가 같이 Chroma를 만들다가 tenant 검증이 깨진다.
    그러면 검색이 빈 결과로 떨어져 근거 없이 답하게 되므로 초기화를 직렬화한다.
    검색 자체는 이 락 밖에서 돈다.
    """
    with _INIT_LOCK:
        return _open_vector_store()


@lru_cache
def _open_vector_store() -> Chroma:
    """코퍼스 판본이 인덱스와 다르면 색인한다.

    판본이 같으면 재기동 시 임베딩을 다시 호출하지 않는다. 문서 수만 비교하면
    조문 수가 그대로인 개정(내용만 바뀐 경우)을 놓쳐서 낡은 임베딩을 계속 쓰게 된다.
    """
    settings = get_settings()
    store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=UpstageEmbeddings(
            model=settings.embedding_model,
            api_key=settings.upstage_api_key,
        ),
        persist_directory=str(settings.chroma_dir),
    )

    version_file = settings.chroma_dir / VERSION_FILE_NAME
    version = snapshot_version()
    if not version_file.exists() or version_file.read_text(encoding="utf-8") != version:
        documents = load_documents()
        # 어차피 전체를 다시 임베딩하므로 비우고 넣는다. 개정으로 폐지된 조문이
        # 인덱스에 남아 근거로 검색되는 것도 이때 같이 정리된다.
        store.reset_collection()
        store.add_documents(list(documents), ids=[document.id for document in documents])
        version_file.write_text(version, encoding="utf-8")
    return store
