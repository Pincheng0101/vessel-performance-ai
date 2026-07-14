#!/usr/bin/env python3
"""Engineer maintenance-event features for the voyage daily dataset.

The script joins maintenance.csv to vt_fd.csv by ship and day, and adds a set of
features that summarize the latest and recent maintenance activity for each row.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any


def _to_int(value: str | None) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if text in {'', 'nan', 'NaN', 'None', 'NULL'}:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def _normalize_event_type(event_type: str | None) -> str:
    if not event_type:
        return ''
    mapping = {
        'DD': 'dry_dock',
        'PP': 'propeller_polishing',
        'UWI': 'underwater_inspection',
        'UWC': 'underwater_cleaning',
        'UWI+PP': 'inspection_plus_polishing',
        'UWC+PP': 'cleaning_plus_polishing',
    }
    return mapping.get(event_type, event_type)


def _is_polishing_event(event_type: str | None) -> bool:
    return bool(event_type) and event_type in {'PP', 'UWI+PP', 'UWC+PP'}


def _is_cleaning_event(event_type: str | None) -> bool:
    return bool(event_type) and event_type in {'UWC', 'UWC+PP', 'DD'}


def _is_inspection_event(event_type: str | None) -> bool:
    return bool(event_type) and event_type in {'UWI', 'UWI+PP'}


def _is_dock_event(event_type: str | None) -> bool:
    return bool(event_type) and event_type == 'DD'


def load_voyage_rows(path: Path) -> list[dict[str, str]]:
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


def load_maintenance_rows(path: Path) -> dict[str, list[dict[str, Any]]]:
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.DictReader(handle))

    by_ship: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        ship_id = (row.get('ship_id') or '').strip()
        if not ship_id:
            continue
        day = _to_int(row.get('event_day'))
        if day is None:
            continue
        by_ship.setdefault(ship_id, []).append(
            {
                'day': day,
                'event_type': row.get('event_type', ''),
                'event_type_normalized': _normalize_event_type(row.get('event_type', '')),
                'propeller_condition': row.get('propeller_condition', ''),
                'hull_fouling_type': row.get('hull_fouling_type', ''),
                'hull_coating_condition': row.get('hull_coating_condition', ''),
                'cavitation_found': row.get('cavitation_found', ''),
                'draft_fwd_m': row.get('draft_fwd_m', ''),
                'draft_aft_m': row.get('draft_aft_m', ''),
            }
        )

    for events in by_ship.values():
        events.sort(key=lambda entry: entry['day'])
    return by_ship


def engineer_features(
    voyage_rows: list[dict[str, str]], maintenance_by_ship: dict[str, list[dict[str, Any]]]
) -> list[dict[str, Any]]:
    output_rows: list[dict[str, Any]] = []

    for row in voyage_rows:
        ship_id = (row.get('De-identification Name') or '').strip()
        day = _to_int(row.get('NOON_UTC'))
        if day is None:
            day = -1

        events = maintenance_by_ship.get(ship_id, [])
        history = [event for event in events if event['day'] <= day]
        latest = history[-1] if history else None

        features: dict[str, Any] = {}
        features['days_since_last_maintenance'] = (day - latest['day']) if latest else day
        features['has_ever_had_maintenance'] = int(bool(latest))
        features['maintenance_event_count_all'] = len(history)
        features['maintenance_event_count_30d'] = sum(1 for event in history if day - event['day'] <= 30)
        features['maintenance_event_count_90d'] = sum(1 for event in history if day - event['day'] <= 90)
        features['maintenance_event_count_180d'] = sum(1 for event in history if day - event['day'] <= 180)
        features['has_maintenance_today'] = int(any(event['day'] == day for event in history))

        last_polishing = next((event for event in reversed(history) if _is_polishing_event(event['event_type'])), None)
        last_cleaning = next((event for event in reversed(history) if _is_cleaning_event(event['event_type'])), None)
        last_inspection = next(
            (event for event in reversed(history) if _is_inspection_event(event['event_type'])), None
        )
        last_dock = next((event for event in reversed(history) if _is_dock_event(event['event_type'])), None)

        features['days_since_last_polishing'] = (day - last_polishing['day']) if last_polishing else day
        features['has_ever_had_polishing'] = int(bool(last_polishing))
        features['days_since_last_cleaning'] = (day - last_cleaning['day']) if last_cleaning else day
        features['has_ever_had_cleaning'] = int(bool(last_cleaning))
        features['days_since_last_inspection'] = (day - last_inspection['day']) if last_inspection else day
        features['has_ever_had_inspection'] = int(bool(last_inspection))
        features['days_since_last_dock'] = (day - last_dock['day']) if last_dock else day
        features['has_ever_had_dock'] = int(bool(last_dock))

        features['last_maintenance_event_type'] = latest['event_type'] if latest else ''
        features['last_maintenance_event_type_normalized'] = latest['event_type_normalized'] if latest else ''
        features['last_maintenance_propeller_condition'] = latest['propeller_condition'] if latest else ''
        features['last_maintenance_hull_fouling_type'] = latest['hull_fouling_type'] if latest else ''
        features['last_maintenance_hull_coating_condition'] = latest['hull_coating_condition'] if latest else ''
        features['last_maintenance_cavitation_found'] = latest['cavitation_found'] if latest else ''
        features['last_maintenance_draft_fwd_m'] = latest['draft_fwd_m'] if latest else ''
        features['last_maintenance_draft_aft_m'] = latest['draft_aft_m'] if latest else ''

        output_rows.append({**row, **features})

    return output_rows


def write_rows(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description='Add maintenance-event features to vt_fd.csv')
    parser.add_argument('--voyage', default='tmp/yangming-aws-summit-hackathon/vt_fd.csv', help='Path to vt_fd.csv')
    parser.add_argument(
        '--maintenance', default='tmp/yangming-aws-summit-hackathon/maintenance.csv', help='Path to maintenance.csv'
    )
    parser.add_argument(
        '--output',
        default='tmp/yangming-aws-summit-hackathon/vt_fd_with_maintenance_features.csv',
        help='Output CSV path',
    )
    args = parser.parse_args()

    voyage_path = Path(args.voyage)
    maintenance_path = Path(args.maintenance)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    voyage_rows = load_voyage_rows(voyage_path)
    maintenance_by_ship = load_maintenance_rows(maintenance_path)
    output_rows = engineer_features(voyage_rows, maintenance_by_ship)
    write_rows(output_path, output_rows)

    print(f'Processed {len(voyage_rows)} voyage rows')
    print(f'Generated {len(output_rows)} rows with maintenance features')
    print(f'Output written to {output_path}')


if __name__ == '__main__':
    main()
