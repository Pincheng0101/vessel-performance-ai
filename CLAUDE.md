# CLAUDE.md

Python 3.13, `uv`, `ruff`. Single quotes. Line length 120.

```bash
pytest -s tests/unit/
ruff check --fix . && ruff format .
```

# Documentation
- Chinese docs: render every 專有名詞 (proper noun) or technical term as `中文 (英文)` on first use, e.g. 資料湖 (data lake).

# AWS
- CDK: `npx aws-cdk@latest`
- AWS CLI: `AWS_PROFILE=ym-hackathon aws`

