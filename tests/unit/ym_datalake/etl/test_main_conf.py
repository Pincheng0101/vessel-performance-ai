"""CLI bucket resolution — conf/<env>.conf fallback for --bucket."""

import argparse

from ym_datalake.etl.__main__ import _resolve_bucket


def _args(bucket=None, env='dev'):
    return argparse.Namespace(bucket=bucket, env=env)


def _write_conf(tmp_path, bucket_line):
    conf_dir = tmp_path / 'conf'
    conf_dir.mkdir()
    (conf_dir / 'dev.conf').write_text(
        f'app {{\n  datalake {{\n    {bucket_line}\n  }}\n}}\n',
        encoding='utf-8',
    )


def test_explicit_bucket_wins(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _write_conf(tmp_path, 'bucket_name = "conf-bucket"')
    assert _resolve_bucket(_args(bucket='cli-bucket')) == 'cli-bucket'


def test_bucket_from_conf(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _write_conf(tmp_path, 'bucket_name = "conf-bucket"')
    assert _resolve_bucket(_args()) == 'conf-bucket'


def test_empty_conf_bucket_resolves_none(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _write_conf(tmp_path, 'bucket_name = ""')
    assert _resolve_bucket(_args()) is None


def test_missing_conf_file_resolves_none(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert _resolve_bucket(_args()) is None
