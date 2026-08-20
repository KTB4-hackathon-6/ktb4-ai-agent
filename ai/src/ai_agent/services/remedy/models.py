"""문제 판단 Agent와 문서작성 Agent가 공유하는 최소 모델."""

from typing import Literal

from pydantic import BaseModel, Field


class DetectedIssue(BaseModel):
    issue_id: str
    title: str
    summary: str
    facts: dict[str, str] = Field(default_factory=dict)
    severity: Literal["INFO", "LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    related_check_ids: list[str] = Field(default_factory=list)
    related_document_ids: list[str] = Field(default_factory=list)
