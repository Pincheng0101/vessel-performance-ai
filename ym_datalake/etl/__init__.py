"""M2 ETL — local pure-Python curated-zone computation (spec §4).

Consumes the M1 raw zone (Noon Report + event/dim JSONL) and applies ISO 15016
(試航修正), ISO 19030 (效能指標) and derived indicators to produce the curated
fact/dim tables, then uploads partitioned JSONL to S3.

The forward model in ``ym_datalake.synthetic_data`` and this ETL share
``physics``/``curves``/``fleet``; the ETL inverts the exact forward path, so the
injected speed loss is recoverable (closed-loop C13, see ``etl.validate``). The
ETL reads only the raw datasets — never the ``truth/`` ground truth (which is
not uploaded and does not exist in production).
"""
