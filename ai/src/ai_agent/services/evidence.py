"""근거 문장에서 값을 재계산한다. LLM은 문장을 찾기만 하고 계산은 여기서 한다.

실측(9개 문서 × 3회)에서 LLM은 근거 문장을 89% 정확히 찾아냈지만, 그 문장에서
도출한 값은 자주 틀렸다 — 같은 근거 "09시~18시(휴게 12~13)"를 두고 8시간과
9시간이 갈렸다. 그래서 역할을 나눈다:

  LLM  : 근거가 되는 원문 문장을 찾는다 (강점)
  코드 : 그 문장이 원문에 실재하는지 확인하고, 값을 직접 계산한다 (결정론적)

계산할 수 없으면 None을 돌려준다. 틀린 값을 내느니 "모른다"고 하는 쪽이,
확인 못 한 값으로 위법 판정을 내리지 않는다는 이 서비스의 원칙에 맞는다.
"""
import re

# ---------- 코드가 근거 문장에서 값을 재계산 ----------

_TIME = r'(\d{1,2})\s*(?:시|:)\s*(\d{1,2})?\s*분?'


def _times(ev: str) -> list[int]:
    """근거 문장의 시각들을 분 단위로. '09시 00분' '08:00' 둘 다."""
    out = []
    for h, m in re.findall(_TIME, ev or ''):
        hh = int(h)
        if hh > 24:
            continue
        out.append(hh * 60 + int(m or 0))
    return out


def span_minutes(ev: str) -> int | None:
    """시각 범위 → 분. 09시~18시 = 540분."""
    t = _times(ev)
    if len(t) < 2:
        return None
    d = t[1] - t[0]
    return d if d > 0 else None


def rest_minutes(ev: str) -> int | None:
    """휴게시간. 시각범위 / 'N분' / 'N시간 M분' / 영문 'N hour(s) M minute(s)'."""
    if (s := span_minutes(ev)) is not None:
        return s
    # 농업/축산업 서식은 "(1) 시간 (30) 분"처럼 괄호 안에 숫자를 적는다.
    if m := re.search(r'\(?\s*(\d+)\s*\)?\s*시간\s*\(?\s*(\d+)?\s*\)?\s*분', ev or ''):
        return int(m.group(1)) * 60 + int(m.group(2) or 0)
    if m := re.search(r'\(?\s*(\d+)\s*\)?\s*시간', ev or ''):
        return int(m.group(1)) * 60
    if m := re.search(r'\((\d+)\)\s*hour\(?s?\)?\s*\((\d+)\)\s*minute', ev or ''):
        return int(m.group(1)) * 60 + int(m.group(2))
    if m := re.search(r'(?<!\d)(\d{1,3})\s*분', ev or ''):
        return int(m.group(1))
    return None


def weekly_holidays(ev: str) -> int | None:
    """주휴일 부여 여부. 체크된 표기 + 요일/주N회 문구."""
    e = ev or ''
    checked = r'(?:☑|■|▣|\[\s*[VvXxOo]\s*\])'
    if re.search(rf'{checked}\s*[^\n]{{0,6}}?일요일', e) or re.search(
        rf'{checked}\s*주\s*1\s*회', e
    ):
        return 1
    if re.search(r'주휴일\s*(?:매주|은)?\s*\S*요일', e) or re.search(
        r'약정\s*휴일은\s*매주\s*\S+요일', e
    ):
        return 1
    if re.search(r'주\s*1\s*회', e):
        return 1
    if re.search(r'□\s*일요일', e):
        return 0
    return None


def contract_months(ev: str) -> int | None:
    """'( 48 ) 개월' 또는 날짜 범위 차이."""
    if m := re.search(r'\(\s*(\d{1,3})\s*\)\s*개월', ev or ''):
        return int(m.group(1))
    d = re.findall(r'(20\d{2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})', ev or '')
    if len(d) >= 2:
        (y1, m1, _), (y2, m2, d2) = d[0], d[1]
        months = (int(y2) - int(y1)) * 12 + (int(m2) - int(m1))
        return months + 1 if int(d2) >= 28 else months
    if m := re.search(r'(?<!\d)(\d{1,3})\s*개월', ev or ''):
        return int(m.group(1))
    return None


def daily_working_minutes(work_evidence: str, rest_evidence: str) -> int | None:
    """소정근로시간(분) = 시업~종업 - 휴게. 둘 중 하나라도 못 읽으면 None."""
    span = span_minutes(work_evidence)
    rest = rest_minutes(rest_evidence)
    if span is None or rest is None:
        return None
    net = span - rest
    return net if net > 0 else None
