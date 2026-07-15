"""``ml_york`` — a self-contained modelling package for the ME full-speed fuel-consumption task.

Everything under here obeys one hard rule: the *only* data are ``dataset/vt_fd.csv`` and
``dataset/maintenance.csv``. No curated-lake table, fitted reference curve, synthetic price or
vessel particular is read. Reuse from the wider repo is limited to pure formulas and
README-stated facts, re-declared locally so this package stands alone.
"""
