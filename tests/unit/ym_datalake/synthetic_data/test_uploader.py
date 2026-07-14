"""Uploader tests — assert S3 keys/paths without AWS (patch the module client)."""

from unittest.mock import patch

import pytest

from ym_datalake.synthetic_data import uploader


def _write(path, text='{"k": 1}\n'):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


@patch('ym_datalake.synthetic_data.uploader.s3')
def test_upload_raw_puts_expected_keys(s3_mock, tmp_path):
    _write(tmp_path / 'raw' / 'vessel_master' / 'vessel_master.jsonl')
    _write(tmp_path / 'raw' / 'noon_report' / 'imo_number=9700001' / 'year=2021' / 'data.jsonl')
    _write(tmp_path / 'truth' / 'ground_truth_daily.jsonl')  # must be skipped

    keys = uploader.upload_raw('my-bucket', tmp_path)

    assert set(keys) == {
        'raw/vessel_master/vessel_master.jsonl',
        'raw/noon_report/imo_number=9700001/year=2021/data.jsonl',
    }
    assert all(not k.startswith('truth') for k in keys)
    assert s3_mock.put_object.call_count == 2

    calls = {c.kwargs['Key']: c.kwargs for c in s3_mock.put_object.call_args_list}
    assert set(calls) == set(keys)
    assert all(kw['Bucket'] == 'my-bucket' for kw in calls.values())
    assert 'raw/noon_report/imo_number=9700001/year=2021/data.jsonl' in calls


@patch('ym_datalake.synthetic_data.uploader.s3')
def test_upload_raw_missing_dir_raises(s3_mock, tmp_path):
    with pytest.raises(FileNotFoundError):
        uploader.upload_raw('my-bucket', tmp_path)
    s3_mock.put_object.assert_not_called()
