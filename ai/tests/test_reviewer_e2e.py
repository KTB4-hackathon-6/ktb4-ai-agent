import copy
import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ai_agent.main import app

CASES = json.loads(
    (Path(__file__).parents[1] / "evals" / "reviewer_cases.json").read_text(encoding="utf-8")
)
RUNS = int(os.getenv("AI_EVAL_RUNS", "3"))


@pytest.mark.skipif(
    os.getenv("RUN_LIVE_AI_EVAL") != "1",
    reason="RUN_LIVE_AI_EVAL=1일 때 실제 모델 평가를 실행합니다.",
)
@pytest.mark.parametrize("case", CASES, ids=[case["name"] for case in CASES])
def test_reviewer_e2e(case: dict) -> None:
    observed_issue_types = []

    for run in range(RUNS):
        request = copy.deepcopy(case["request"])
        request["requestId"] = f"{request['requestId']}-{run + 1}"
        response = TestClient(app).post("/analyze", json=request)

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "COMPLETED", body
        assert body["result"]["answer"].strip()
        findings = body["result"]["analysis"]["findings"]
        by_type = {finding["title"]: finding for finding in findings}
        issue_types = sorted(by_type)
        expected_types = sorted(case["expected"]["issueTypes"])
        assert issue_types == expected_types, body

        for issue_type, links in case["expected"]["links"].items():
            finding = by_type[issue_type]
            assert set(links["checkIds"]) <= set(finding["relatedCheckIds"])
            assert set(links["documentIds"]) <= set(finding["relatedDocumentIds"])

        observed_issue_types.append(issue_types)

    assert all(types == observed_issue_types[0] for types in observed_issue_types)
