"""Background job runner.

One durable primitive — a row in the ``jobs`` table — backs both scheduled
work ("run every Monday") and offloaded work ("do this slow thing outside the
request"). See ``app/models/job.py`` for the data model, ``worker.py`` for the
loop that runs jobs, and ``schedules.py`` for the recurring layer.
"""
