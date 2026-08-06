"""Schemas for the Goal Evaluator — an on-demand AI read on goal alignment.

``GoalEvaluation`` is the strict structured output the model must return; the
route wraps it in ``GoalEvaluationResponse`` (adding the model + scope), mirroring
``DailySummaryResponse``. The dashboard's numbers/bars are computed client-side and
free; only this qualitative read costs a provider call.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EvalScope = Literal["today", "week"]


class GoalSignal(BaseModel):
    """One factor helping or working against the goal — an evidence row in the rail."""

    model_config = ConfigDict(extra="ignore")

    emoji: str = Field(default="", max_length=8, description="A single leading emoji.")
    text: str = Field(max_length=160, description="The factor, in a short phrase.")
    value: str = Field(
        default="", max_length=24, description="A compact metric, e.g. '+3 wks' or '−42 g'."
    )


class GoalEvaluation(BaseModel):
    """The strict structured output the model returns for a goal evaluation."""

    alignment_score: int = Field(
        ge=0, le=100, description="How well the period aligns with the goal, 0–100."
    )
    verdict: str = Field(
        max_length=80, description="A short headline verdict, e.g. 'On pace, just.'"
    )
    readout: str = Field(
        max_length=1200,
        description="A short prose read on progress (2–4 sentences), second person.",
    )
    helping: list[GoalSignal] = Field(
        default_factory=list, description="Up to a few things working in the goal's favour."
    )
    hurting: list[GoalSignal] = Field(
        default_factory=list, description="Up to a few things working against the goal."
    )
    adjustment: str = Field(
        max_length=300, description="One concrete adjustment to suggest (never preachy)."
    )


class GoalEvaluationResponse(BaseModel):
    """What the endpoint returns: the evaluation, its scope, and the model used."""

    model: str
    scope: EvalScope
    evaluation: GoalEvaluation
