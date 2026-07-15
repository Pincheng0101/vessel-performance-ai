import sys
from pathlib import Path

import pandas as pd

sys.path.append(str(Path(__file__).resolve().parents[3] / 'scripts'))

import build_model_ready_data as bmd
import generate_submission as gs


def test_build_submission_frame_uses_expected_columns() -> None:
    prediction_df = pd.DataFrame(
        {
            'De-identification Name': ['S1', 'S2'],
            'NOON_UTC': [100, 101],
            'target_fuel_column': ['ME_FULLSPEED_CONSUMP_HSHFO', 'ME_FULLSPEED_CONSUMP_LSMGO'],
        }
    )

    predictions = [10.0, 20.0]
    submission = gs.build_submission_frame(prediction_df, predictions)

    assert list(submission.columns) == ['ship_id', 'day', 'fuel_type', 'predicted_value']
    assert submission.iloc[0]['ship_id'] == 'S1'
    assert submission.iloc[1]['fuel_type'] == 'ME_FULLSPEED_CONSUMP_LSMGO'
    assert submission.iloc[0]['predicted_value'] == bmd.convert_total_energy_to_fuel_amount(
        10.0, 'ME_FULLSPEED_CONSUMP_HSHFO'
    )
