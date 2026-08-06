# test.py
# Small, slightly-complex data-manipulation examples using only the Python stdlib.

from __future__ import annotations
from dataclasses import dataclass
from collections import defaultdict, deque
from csv import DictReader
from datetime import datetime
from functools import lru_cache
from typing import Callable, Dict, Generator, Iterable, List, Optional, Tuple, Any
import io
import json

# Lightweight record type with typed parsing helper
@dataclass
class Record:
    id: str
    date: datetime
    category: str
    value: float
    attrs: Dict[str, Any]

    @staticmethod
    def from_dict(d: Dict[str, str]) -> "Record":
        # minimal defensive parsing; rely on caller for schema correctness
        return Record(
            id=d["id"],
            date=datetime.fromisoformat(d["date"]),
            category=d.get("category", ""),
            value=float(d.get("value", 0.0)),
            attrs={k: v for k, v in d.items() if k not in {"id", "date", "category", "value"}},
        )

# Stream a CSV file (path or file-like) as Record objects
def stream_csv(reader: io.TextIOBase) -> Generator[Record, None, None]:
    for row in DictReader(reader):
        try:
            yield Record.from_dict(row)
        except Exception:
            # skip malformed rows but continue; tighten if needed
            continue

# Join two smaller/larger streams on a key (left join if right_small=True, else materialize right)
def join_streams(
    left: Iterable[Record],
    right: Iterable[Record],
    key_fn: Callable[[Record], str],
    right_small: bool = True,
    join_name: str = "right",
) -> Generator[Dict[str, Any], None, None]:
    if right_small:
        right_map: Dict[str, List[Record]] = defaultdict(list)
        for r in right:
            right_map[key_fn(r)].append(r)
        for l in left:
            matches = right_map.get(key_fn(l), [])
            if not matches:
                yield {"left": l, join_name: None}
            else:
                for r in matches:
                    yield {"left": l, join_name: r}
    else:
        left_map: Dict[str, List[Record]] = defaultdict(list)
        for l in left:
            left_map[key_fn(l)].append(l)
        for r in right:
            matches = left_map.get(key_fn(r), [])
            if not matches:
                yield {"left": None, join_name: r}
            else:
                for l in matches:
                    yield {"left": l, join_name: r}

# Group and aggregate generic helper
def group_aggregate(
    rows: Iterable[Record],
    group_fn: Callable[[Record], str],
    agg_fns: Dict[str, Callable[[List[Record]], Any]],
) -> Dict[str, Dict[str, Any]]:
    groups: Dict[str, List[Record]] = defaultdict(list)
    for r in rows:
        groups[group_fn(r)].append(r)
    result: Dict[str, Dict[str, Any]] = {}
    for k, items in groups.items():
        result[k] = {name: fn(items) for name, fn in agg_fns.items()}
    return result

# Simple moving average over a stream of numeric values (generator)
def moving_average(values: Iterable[float], window: int) -> Generator[Optional[float], None, None]:
    dq = deque()
    s = 0.0
    for v in values:
        dq.append(v)
        s += v
        if len(dq) > window:
            s -= dq.popleft()
        if len(dq) == window:
            yield s / window
        else:
            yield None

# Pivot table: rows -> {row_key: {col_key: aggregated_value}}
def pivot_table(
    rows: Iterable[Record],
    row_key: Callable[[Record], str],
    col_key: Callable[[Record], str],
    value_fn: Callable[[Record], float],
    agg: Callable[[List[float]], float] = lambda vals: sum(vals),
) -> Dict[str, Dict[str, float]]:
    tmp: Dict[Tuple[str, str], List[float]] = defaultdict(list)
    for r in rows:
        tmp[(row_key(r), col_key(r))].append(value_fn(r))
    out: Dict[str, Dict[str, float]] = defaultdict(dict)
    for (rkey, ckey), vals in tmp.items():
        out[rkey][ckey] = agg(vals)
    return out

# Example composite pipeline: load CSVs from strings (demo), join, aggregate and compute moving avg per category
def demo_pipeline():
    users_csv = io.StringIO("""id,date,category,value,meta
1,2026-08-01T09:00:00,A,10.5,x
2,2026-08-01T10:00:00,B,7.0,y
1,2026-08-02T11:00:00,A,12.0,z
3,2026-08-02T12:00:00,A,6.0,w
""")
    events_csv = io.StringIO("""id,date,category,value,source
1,2026-08-01T09:30:00,A,1.0,S1
2,2026-08-01T10:10:00,B,2.5,S2
4,2026-08-02T13:00:00,C,3.3,S3
""")

    users = list(stream_csv(users_csv))      # small dataset, safe to materialize
    events = list(stream_csv(events_csv))    # small as well
    int(input("angka1"))
    # join on id, assume events is "right" small table
    joined = list(join_streams(users, events, key_fn=lambda r: r.id, right_small=True, join_name="event"))

    # compute per-category aggregates: count, total, avg value (users.value)
    cat_aggs = group_aggregate(
        (j["left"] for j in joined if j["left"]),
        group_fn=lambda r: r.category,
        agg_fns={
            "count": lambda items: len(items),
            "total": lambda items: sum(i.value for i in items),
            "avg": lambda items: (sum(i.value for i in items) / len(items) if items else 0.0),
        },
    )

    # moving average of totals over chronological category stream (example for category 'A')
    vals_for_A = [r.value for r in sorted((u for u in users if u.category == "A"), key=lambda x: x.date)]
    ma3 = list(moving_average(vals_for_A, window=3))

    # pivot: category x date (day) -> total value
    pivot = pivot_table(
        users,
        row_key=lambda r: r.category,
        col_key=lambda r: r.date.date().isoformat(),
        value_fn=lambda r: r.value,
        agg=lambda vs: sum(vs),
    )

    # memoized heavy computation example (pretend slow)
    @lru_cache(maxsize=128)
    def heavy_summary(category: str) -> Dict[str, Any]:
        # ponytail: simulate heavy I/O-bound or CPU-bound work; use proper cache or external store if larger scale
        items = [u for u in users if u.category == category]
        return {"count": len(items), "sum": sum(i.value for i in items)}

    # final report
    report = {
        "category_aggregates": cat_aggs,
        "moving_average_A": ma3,
        "pivot": pivot,
        "heavy_A": heavy_summary("A"),
    }

    print(json.dumps(report, default=str, indent=2))


if __name__ == "__main__":
    demo_pipeline()
