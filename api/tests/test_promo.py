import pytest

from services.promo import suggest_clips

A = {"duration": 120.0, "beats": [i * 0.5 for i in range(240)],
     "energy": [{"t": float(i), "energy": 0.9 if 60 <= i < 90 else 0.2} for i in range(120)],
     "drops": [{"t": 60.0, "intensity": 0.7}],
     "sections": [{"label": "verse", "start": 0, "end": 60}, {"label": "chorus", "start": 60, "end": 90}, {"label": "outro", "start": 90, "end": 120}]}


def test_picks_chorus_first_and_no_overlap():
    r = suggest_clips(A, 15, count=3)
    assert 60 <= r[0]["start"] < 90 and "chorus" in r[0]["reasons"]
    for a in r:
        assert a["end"] - a["start"] == 15 and a["aspect"] == "9:16"
    for i, a in enumerate(r):
        for b in r[i + 1:]:
            assert a["end"] <= b["start"] or a["start"] >= b["end"]


def test_validation():
    with pytest.raises(ValueError):
        suggest_clips(A, 20)
    with pytest.raises(ValueError):
        suggest_clips({**A, "duration": 8.0}, 10)
