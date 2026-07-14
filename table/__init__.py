"""Glue table column definitions: (column_name, glue_type) lists.

``table.schema`` holds all 20 tables of the ym_hackathon data lake (6 raw, 14
curated), flat and unpartitioned. The CDK stack registers exactly ``ALL_TABLES``.
"""

from table.schema import ALL_TABLES, CURATED_TABLES, RAW_TABLES, SHIP_IDS

__all__ = [
    'ALL_TABLES',
    'CURATED_TABLES',
    'RAW_TABLES',
    'SHIP_IDS',
]
