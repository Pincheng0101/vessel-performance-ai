"""Uploader tests — assert the S3 keys without touching AWS (patch the client)."""

from unittest.mock import patch

import pytest

from ym_datalake.etl import uploader


def _write(path, text='{"k": 1}\n'):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


@patch('ym_datalake.etl.uploader.s3')
def test_upload_raw_puts_the_six_raw_tables(s3_mock, tmp_path):
    for name in ('noon_report', 'vessel_master', 'maintenance_event', 'reference_curve', 'uwi', 'fuel_price'):
        _write(tmp_path / 'raw' / name / f'{name}.jsonl')
    _write(tmp_path / 'curated' / 'dim_vessel' / 'dim_vessel.jsonl')  # another zone: not uploaded here

    keys = uploader.upload_raw('my-bucket', tmp_path)

    assert set(keys) == {
        'raw/noon_report/noon_report.jsonl',
        'raw/vessel_master/vessel_master.jsonl',
        'raw/maintenance_event/maintenance_event.jsonl',
        'raw/reference_curve/reference_curve.jsonl',
        'raw/uwi/uwi.jsonl',
        'raw/fuel_price/fuel_price.jsonl',
    }
    assert s3_mock.put_object.call_count == 6
    assert all(c.kwargs['Bucket'] == 'my-bucket' for c in s3_mock.put_object.call_args_list)


@patch('ym_datalake.etl.uploader.s3')
def test_upload_curated_puts_the_curated_tables(s3_mock, tmp_path):
    _write(tmp_path / 'curated' / 'fact_performance_daily' / 'fact_performance_daily.jsonl')
    _write(tmp_path / 'curated' / 'dim_port' / 'dim_port.jsonl')
    _write(tmp_path / 'raw' / 'noon_report' / 'noon_report.jsonl')  # another zone: not uploaded here

    keys = uploader.upload_curated('my-bucket', tmp_path)

    assert set(keys) == {
        'curated/fact_performance_daily/fact_performance_daily.jsonl',
        'curated/dim_port/dim_port.jsonl',
    }
    assert s3_mock.put_object.call_count == 2


@patch('ym_datalake.etl.uploader.s3')
def test_upload_of_a_missing_zone_raises(s3_mock, tmp_path):
    with pytest.raises(FileNotFoundError):
        uploader.upload_raw('my-bucket', tmp_path)
    with pytest.raises(FileNotFoundError):
        uploader.upload_curated('my-bucket', tmp_path)
    s3_mock.put_object.assert_not_called()
