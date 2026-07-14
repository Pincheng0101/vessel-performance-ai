"""Curated uploader tests — assert S3 keys/paths without AWS (patch the client)."""

from unittest.mock import patch

import pytest

from ym_datalake.etl import uploader


def _write(path, text='{"k": 1}\n'):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


@patch('ym_datalake.etl.uploader.s3')
def test_upload_curated_puts_expected_keys(s3_mock, tmp_path):
    _write(tmp_path / 'curated' / 'dim_vessel' / 'dim_vessel.jsonl')
    _write(
        tmp_path / 'curated' / 'fact_performance_daily' / 'imo_number=9700006' / 'year=2021' / 'month=07' / 'data.jsonl'
    )
    _write(tmp_path / 'raw' / 'noon_report' / 'imo_number=9700001' / 'year=2021' / 'data.jsonl')  # skipped
    _write(tmp_path / 'truth' / 'ground_truth_daily.jsonl')  # skipped

    keys = uploader.upload_curated('my-bucket', tmp_path)

    assert set(keys) == {
        'curated/dim_vessel/dim_vessel.jsonl',
        'curated/fact_performance_daily/imo_number=9700006/year=2021/month=07/data.jsonl',
    }
    assert all(k.startswith('curated/') for k in keys)
    assert s3_mock.put_object.call_count == 2
    assert all(c.kwargs['Bucket'] == 'my-bucket' for c in s3_mock.put_object.call_args_list)


@patch('ym_datalake.etl.uploader.s3')
def test_upload_curated_missing_dir_raises(s3_mock, tmp_path):
    with pytest.raises(FileNotFoundError):
        uploader.upload_curated('my-bucket', tmp_path)
    s3_mock.put_object.assert_not_called()


@patch('ym_datalake.etl.uploader.s3')
def test_upload_real_data_puts_only_real_tables(s3_mock, tmp_path):
    _write(tmp_path / 'raw' / 'vt_fd' / 'ship_id=S1' / 'data.jsonl')
    _write(tmp_path / 'raw' / 'vt_fd' / 'ship_id=S21' / 'data.jsonl')
    _write(tmp_path / 'raw' / 'maintenance' / 'maintenance.jsonl')
    _write(tmp_path / 'raw' / 'vessel' / 'vessel.jsonl')
    _write(tmp_path / 'raw' / 'noon_report' / 'imo_number=9700001' / 'year=2021' / 'data.jsonl')  # skipped
    _write(tmp_path / 'curated' / 'dim_vessel' / 'dim_vessel.jsonl')  # skipped

    keys = uploader.upload_real_data('my-bucket', tmp_path)

    assert set(keys) == {
        'raw/vt_fd/ship_id=S1/data.jsonl',
        'raw/vt_fd/ship_id=S21/data.jsonl',
        'raw/maintenance/maintenance.jsonl',
        'raw/vessel/vessel.jsonl',
    }
    assert s3_mock.put_object.call_count == 4
    assert all(c.kwargs['Bucket'] == 'my-bucket' for c in s3_mock.put_object.call_args_list)


@patch('ym_datalake.etl.uploader.s3')
def test_upload_real_data_missing_dir_raises(s3_mock, tmp_path):
    with pytest.raises(FileNotFoundError):
        uploader.upload_real_data('my-bucket', tmp_path)
    s3_mock.put_object.assert_not_called()


@patch('ym_datalake.etl.uploader.s3')
def test_upload_real_curated_puts_only_fact_ship_tables(s3_mock, tmp_path):
    _write(tmp_path / 'curated' / 'fact_ship_daily' / 'ship_id=S1' / 'data.jsonl')
    _write(tmp_path / 'curated' / 'fact_ship_alert' / 'fact_ship_alert.jsonl')
    _write(tmp_path / 'curated' / 'dim_vessel' / 'dim_vessel.jsonl')  # skipped (synthetic)
    _write(tmp_path / 'raw' / 'vt_fd' / 'ship_id=S1' / 'data.jsonl')  # skipped (raw)

    keys = uploader.upload_real_curated('my-bucket', tmp_path)

    assert set(keys) == {
        'curated/fact_ship_daily/ship_id=S1/data.jsonl',
        'curated/fact_ship_alert/fact_ship_alert.jsonl',
    }
    assert s3_mock.put_object.call_count == 2


@patch('ym_datalake.etl.uploader.s3')
def test_upload_real_curated_missing_dir_raises(s3_mock, tmp_path):
    with pytest.raises(FileNotFoundError):
        uploader.upload_real_curated('my-bucket', tmp_path)
    s3_mock.put_object.assert_not_called()
