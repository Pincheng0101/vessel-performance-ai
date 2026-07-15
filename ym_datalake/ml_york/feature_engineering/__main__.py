"""CLI:  python -m ym_datalake.ml_york.feature_engineering --data dataset --out etl"""

from __future__ import annotations

import argparse

from ym_datalake.ml_york.feature_engineering.build import build_features


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', default='dataset', help='dir holding vt_fd.csv + maintenance.csv')
    parser.add_argument('--out', default='etl', help='output dir for the features CSV + manifest')
    args = parser.parse_args()

    df = build_features(args.data, args.out)
    n_safe = len(df.columns) - 40  # engineered + key/flag/target columns beyond the original 40
    print(f'wrote {args.out}/vt_fd_features.csv  rows={len(df)}  cols={len(df.columns)} (+{n_safe} added)')
    print(f'wrote {args.out}/feature_manifest.json  predict_rows={int(df["is_predict"].sum())}')


if __name__ == '__main__':
    main()
