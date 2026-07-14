"""ETL for the real hackathon dataset: 3 source files -> the 20-table lake.

``python -m ym_datalake.etl build`` reads ``dataset/{vt_fd.csv,maintenance.csv,vessel.jsonl}``
and writes all 20 tables as flat JSONL. The raw zone keeps the three sources verbatim; the
curated zone is where every mutation and derivation happens. See ``curated.compute`` for
the DAG.
"""
