"""ETL for the real hackathon dataset.

``load-real`` reads ``dataset/{vt_fd.csv,maintenance.csv,vessel.jsonl}`` into the
partitioned raw JSONL zone; ``compute-real`` derives the curated ``fact_ship_*``
tables (daily performance, anomalies, alerts, maintenance recommendations) from
the same sources. Both can upload their output to S3 for the Glue tables to
project over.
"""
