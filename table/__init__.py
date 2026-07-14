"""Glue table column definitions: (column_name, glue_type) lists.

table.real_data holds the real hackathon dataset schemas registered by the CDK
stack.
"""

from table.real_data import (
    FACT_SHIP_ALERT_COLUMNS,
    FACT_SHIP_ANOMALY_COLUMNS,
    FACT_SHIP_DAILY_COLUMNS,
    FACT_SHIP_MAINTENANCE_RECOMMENDATION_COLUMNS,
    MAINTENANCE_COLUMNS,
    SHIP_IDS,
    VESSEL_COLUMNS,
    VT_FD_COLUMNS,
)

__all__ = [
    'FACT_SHIP_ALERT_COLUMNS',
    'FACT_SHIP_ANOMALY_COLUMNS',
    'FACT_SHIP_DAILY_COLUMNS',
    'FACT_SHIP_MAINTENANCE_RECOMMENDATION_COLUMNS',
    'MAINTENANCE_COLUMNS',
    'SHIP_IDS',
    'VESSEL_COLUMNS',
    'VT_FD_COLUMNS',
]
