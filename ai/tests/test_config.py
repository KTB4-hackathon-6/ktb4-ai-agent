from pathlib import Path

from ai_agent.config import ROOT_ENV


def test_env_is_fixed_to_project_root() -> None:
    assert ROOT_ENV == Path(__file__).resolve().parents[2] / ".env"
