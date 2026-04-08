"""
models.py — Pydantic typed models for the OpenEnv spec.
Defines typed Observation, Action, and Reward models.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Union, Dict, Any
from enum import Enum


# ── Enums ─────────────────────────────────────────────────────────────────────

class SatelliteRole(str, Enum):
    PLANNER = "planner"
    EXECUTOR = "executor"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class WeatherCondition(str, Enum):
    CLEAR = "clear"
    STORM = "storm"
    SOLAR_FLARE = "solar_flare"
    OVERLOAD = "overload"


# ── Observation Models ─────────────────────────────────────────────────────────

class SatelliteObservation(BaseModel):
    id: str = Field(..., description="Unique satellite identifier, e.g. SAT-001")
    battery: float = Field(..., ge=0.0, le=100.0, description="Battery level 0–100%")
    position: List[float] = Field(..., min_length=2, max_length=2, description="[longitude, latitude]")
    role: SatelliteRole = Field(..., description="Current satellite role")
    active: bool = Field(..., description="Whether satellite is operational")
    tasks_completed: int = Field(..., ge=0, description="Total tasks completed this episode")
    storage_used: float = Field(..., ge=0.0, le=100.0, description="Storage used 0–100%")


class TaskObservation(BaseModel):
    id: str = Field(..., description="Unique task identifier, e.g. TASK-001")
    location: List[float] = Field(..., min_length=2, max_length=2, description="[longitude, latitude]")
    priority: TaskPriority = Field(..., description="Task urgency level")
    battery_cost: float = Field(..., gt=0, description="Battery required to execute task")
    storage_cost: float = Field(..., gt=0, description="Storage consumed by task data")
    assigned_to: Optional[str] = Field(None, description="Satellite ID if assigned, else null")
    completed: bool = Field(False, description="Whether task has been executed")
    disaster_related: bool = Field(False, description="True if task is in active disaster zone")


class Observation(BaseModel):
    """Full environment observation returned by reset() and step()."""
    satellites: List[SatelliteObservation]
    tasks: List[TaskObservation]
    weather: WeatherCondition
    disaster_active: bool = Field(..., description="Whether a disaster is currently active")
    disaster_sector: Optional[List[float]] = Field(None, description="Disaster location [lon, lat] or null")
    step: int = Field(..., ge=0, description="Current episode step")
    max_steps: int = Field(..., gt=0, description="Maximum steps per episode")
    difficulty: str = Field(..., description="Episode difficulty: easy | medium | hard")
    total_reward: float = Field(..., description="Cumulative reward this episode")


# ── Action Models ──────────────────────────────────────────────────────────────

class AssignTaskAction(BaseModel):
    type: Literal["assign_task"]
    satellite_id: str = Field(..., description="ID of the executor satellite")
    task_id: str = Field(..., description="ID of the task to assign")

    class Config:
        json_schema_extra = {
            "example": {"type": "assign_task", "satellite_id": "SAT-002", "task_id": "TASK-005"}
        }


class ChangeRoleAction(BaseModel):
    type: Literal["change_role"]
    satellite_id: str = Field(..., description="ID of satellite to switch role")

    class Config:
        json_schema_extra = {
            "example": {"type": "change_role", "satellite_id": "SAT-001"}
        }


class MoveSatelliteAction(BaseModel):
    type: Literal["move_satellite"]
    satellite_id: str = Field(..., description="ID of satellite to reposition")
    direction: Literal["N", "S", "E", "W"] = Field(..., description="Cardinal direction to move")

    class Config:
        json_schema_extra = {
            "example": {"type": "move_satellite", "satellite_id": "SAT-003", "direction": "N"}
        }


class SkipAction(BaseModel):
    type: Literal["skip"]

    class Config:
        json_schema_extra = {"example": {"type": "skip"}}


Action = Union[AssignTaskAction, ChangeRoleAction, MoveSatelliteAction, SkipAction]


# ── Reward Model ───────────────────────────────────────────────────────────────

class Reward(BaseModel):
    """Reward signal returned after each step."""
    value: float = Field(..., description="Reward value for this step")
    cumulative: float = Field(..., description="Total reward accumulated this episode")
    reason: str = Field(..., description="Human-readable explanation of reward")

    class Config:
        json_schema_extra = {
            "example": {
                "value": 2.5,
                "cumulative": 14.3,
                "reason": "CRITICAL task TASK-003 completed by SAT-002 (+disaster bonus)"
            }
        }


# ── Grader Result Model ────────────────────────────────────────────────────────

class GraderResult(BaseModel):
    """Deterministic scoring result for one difficulty level."""
    score: float = Field(..., ge=0.0, le=1.0, description="Normalized score 0.0–1.0")
    breakdown: Dict[str, Any] = Field(..., description="Component scores by category")
    difficulty: str = Field(..., description="Which difficulty was graded")

    class Config:
        json_schema_extra = {
            "example": {
                "score": 0.87,
                "difficulty": "medium",
                "breakdown": {
                    "task_completion": 0.95,
                    "battery_efficiency": 0.72,
                    "storage_efficiency": 0.80
                }
            }
        }


# ── Step Response Model ────────────────────────────────────────────────────────

class StepResponse(BaseModel):
    """Full response returned by POST /step."""
    observation: Observation
    reward: float
    done: bool
    info: Dict[str, Any]
    final_score: Optional[GraderResult] = None
