"""
Satellite Scheduling RL Environment
====================================
OpenEnv-compatible reinforcement learning environment where agents learn
to manage satellite fleets under real-world constraints: disasters,
resource limits, weather, and role-based task scheduling.
"""

import random
import math
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum


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


@dataclass
class Satellite:
    id: str
    battery: float          # 0–100
    position: Tuple[float, float]
    role: SatelliteRole
    active: bool = True
    tasks_completed: int = 0
    storage_used: float = 0.0   # 0–100

    def to_dict(self):
        return {
            "id": self.id,
            "battery": round(self.battery, 2),
            "position": list(self.position),
            "role": self.role.value,
            "active": self.active,
            "tasks_completed": self.tasks_completed,
            "storage_used": round(self.storage_used, 2),
        }


@dataclass
class Task:
    id: str
    location: Tuple[float, float]
    priority: TaskPriority
    battery_cost: float
    storage_cost: float
    assigned_to: Optional[str] = None
    completed: bool = False
    disaster_related: bool = False

    def to_dict(self):
        return {
            "id": self.id,
            "location": list(self.location),
            "priority": self.priority.value,
            "battery_cost": self.battery_cost,
            "storage_cost": self.storage_cost,
            "assigned_to": self.assigned_to,
            "completed": self.completed,
            "disaster_related": self.disaster_related,
        }


class SatelliteSchedulingEnv:
    """
    Main RL Environment for Satellite Task Scheduling.

    Action space:
      - assign_task(satellite_id, task_id)
      - change_role(satellite_id)
      - move_satellite(satellite_id, direction)  # N/S/E/W
      - skip()

    Observation space:
      - satellites: list of satellite states
      - tasks: list of task states
      - weather: current weather condition
      - disaster_active: bool
      - disaster_sector: (x,y) or None
      - step / max_steps
    """

    DIFFICULTY_CONFIG = {
        "easy": {
            "num_satellites": 5,
            "num_tasks": 10,
            "max_steps": 30,
            "disaster_probability": 0.0,
            "chaos_probability": 0.0,
        },
        "medium": {
            "num_satellites": 7,
            "num_tasks": 20,
            "max_steps": 50,
            "disaster_probability": 0.1,
            "chaos_probability": 0.05,
        },
        "hard": {
            "num_satellites": 10,
            "num_tasks": 35,
            "max_steps": 80,
            "disaster_probability": 0.25,
            "chaos_probability": 0.15,
        },
    }

    def __init__(self, difficulty: str = "easy", seed: int = 42):
        assert difficulty in self.DIFFICULTY_CONFIG, f"Invalid difficulty: {difficulty}"
        self.difficulty = difficulty
        self.config = self.DIFFICULTY_CONFIG[difficulty]
        self.seed = seed
        self._rng = random.Random(seed)
        self.reset()

    def reset(self) -> Dict:
        self._rng = random.Random(self.seed)
        self.step_count = 0
        self.done = False
        self.total_reward = 0.0
        self.satellites: List[Satellite] = self._spawn_satellites()
        self.tasks: List[Task] = self._spawn_tasks()
        self.weather = WeatherCondition.CLEAR
        self.disaster_active = False
        self.disaster_sector: Optional[Tuple[float, float]] = None
        return self._get_observation()

    def step(self, action: Dict) -> Tuple[Dict, float, bool, Dict]:
        if self.done:
            raise RuntimeError("Episode is done. Call reset().")

        reward = 0.0
        info = {"action": action, "events": []}
        action_type = action.get("type", "skip")

        if action_type == "assign_task":
            r, msg = self._action_assign_task(action.get("satellite_id"), action.get("task_id"))
            reward += r
            info["events"].append(msg)
        elif action_type == "change_role":
            r, msg = self._action_change_role(action.get("satellite_id"))
            reward += r
            info["events"].append(msg)
        elif action_type == "move_satellite":
            r, msg = self._action_move_satellite(action.get("satellite_id"), action.get("direction", "N"))
            reward += r
            info["events"].append(msg)
        elif action_type == "skip":
            reward -= 0.05

        self._tick_environment()
        self.step_count += 1
        all_done = all(t.completed for t in self.tasks)
        time_up = self.step_count >= self.config["max_steps"]
        self.done = all_done or time_up
        self.total_reward += reward
        obs = self._get_observation()

        response = (obs, reward, self.done, info)
        return response

    def get_state(self) -> Dict:
        return self._get_observation()

    def _action_assign_task(self, sat_id: str, task_id: str) -> Tuple[float, str]:
        sat = self._find_satellite(sat_id)
        task = self._find_task(task_id)
        if sat is None: return -0.2, f"Invalid satellite: {sat_id}"
        if task is None: return -0.2, f"Invalid task: {task_id}"
        if not sat.active: return -0.1, f"Satellite {sat_id} offline"
        if task.completed: return -0.1, f"Task {task_id} already done"
        if task.assigned_to: return -0.1, f"Task {task_id} already assigned"
        if sat.role != SatelliteRole.EXECUTOR: return -0.15, f"{sat_id} must be EXECUTOR"
        if sat.battery < task.battery_cost: return -0.3, f"{sat_id} low battery"
        if sat.storage_used + task.storage_cost > 100: return -0.25, f"{sat_id} storage full"

        sat.battery -= task.battery_cost
        sat.storage_used = min(100, sat.storage_used + task.storage_cost)
        sat.tasks_completed += 1
        task.assigned_to = sat_id
        task.completed = True

        priority_bonus = {"low": 0.5, "medium": 1.0, "high": 1.5, "critical": 2.5}
        reward = priority_bonus.get(task.priority.value, 1.0)
        if task.disaster_related and self.disaster_active:
            reward += 2.0
        return reward, f"Task {task_id} completed by {sat_id}"

    def _action_change_role(self, sat_id: str) -> Tuple[float, str]:
        sat = self._find_satellite(sat_id)
        if sat is None: return -0.2, f"Invalid satellite: {sat_id}"
        if not sat.active: return -0.1, f"Satellite {sat_id} offline"
        sat.role = SatelliteRole.EXECUTOR if sat.role == SatelliteRole.PLANNER else SatelliteRole.PLANNER
        sat.battery -= 2.0
        return 0.0, f"Satellite {sat_id} switched to {sat.role.value}"

    def _action_move_satellite(self, sat_id: str, direction: str) -> Tuple[float, str]:
        sat = self._find_satellite(sat_id)
        if sat is None: return -0.2, f"Invalid satellite: {sat_id}"
        if not sat.active: return -0.1, f"Satellite {sat_id} offline"
        deltas = {"N": (0, 1), "S": (0, -1), "E": (1, 0), "W": (-1, 0)}
        dx, dy = deltas.get(direction.upper(), (0, 0))
        x, y = sat.position
        sat.position = (max(-180, min(180, x + dx * 5)), max(-90, min(90, y + dy * 5)))
        sat.battery -= 0.5
        return 0.05, f"Satellite {sat_id} moved {direction}"

    def _tick_environment(self):
        if self._rng.random() < self.config["chaos_probability"]:
            self.weather = self._rng.choice([WeatherCondition.STORM, WeatherCondition.SOLAR_FLARE, WeatherCondition.OVERLOAD])
        else:
            self.weather = WeatherCondition.CLEAR

        if not self.disaster_active and self._rng.random() < self.config["disaster_probability"]:
            self.disaster_active = True
            self.disaster_sector = (round(self._rng.uniform(-180, 180), 2), round(self._rng.uniform(-90, 90), 2))
            for task in self.tasks:
                if not task.completed and self._distance(task.location, self.disaster_sector) < 30:
                    task.priority = TaskPriority.CRITICAL
                    task.disaster_related = True
        elif self.disaster_active and self._rng.random() < 0.1:
            self.disaster_active = False
            self.disaster_sector = None

        for sat in self.satellites:
            if not sat.active: continue
            drain = 0.2
            if self.weather == WeatherCondition.STORM: drain = 1.5
            elif self.weather == WeatherCondition.SOLAR_FLARE: drain = 2.0
            elif self.weather == WeatherCondition.OVERLOAD: drain = 1.0
            sat.battery = max(0.0, sat.battery - drain)
            if sat.battery == 0: sat.active = False

    def _get_observation(self) -> Dict:
        return {
            "satellites": [s.to_dict() for s in self.satellites],
            "tasks": [t.to_dict() for t in self.tasks],
            "weather": self.weather.value,
            "disaster_active": self.disaster_active,
            "disaster_sector": list(self.disaster_sector) if self.disaster_sector else None,
            "step": self.step_count,
            "max_steps": self.config["max_steps"],
            "difficulty": self.difficulty,
            "total_reward": round(self.total_reward, 4),
        }

    def _spawn_satellites(self) -> List[Satellite]:
        sats = []
        n = self.config["num_satellites"]
        planner_count = max(1, n // 4)
        for i in range(n):
            role = SatelliteRole.PLANNER if i < planner_count else SatelliteRole.EXECUTOR
            sats.append(Satellite(
                id=f"SAT-{i+1:03d}",
                battery=round(self._rng.uniform(60, 100), 2),
                position=(round(self._rng.uniform(-180, 180), 2), round(self._rng.uniform(-90, 90), 2)),
                role=role,
            ))
        return sats

    def _spawn_tasks(self) -> List[Task]:
        tasks = []
        priorities = list(TaskPriority)
        weights = [0.4, 0.35, 0.2, 0.05]
        for i in range(self.config["num_tasks"]):
            priority = self._rng.choices(priorities, weights=weights, k=1)[0]
            tasks.append(Task(
                id=f"TASK-{i+1:03d}",
                location=(round(self._rng.uniform(-180, 180), 2), round(self._rng.uniform(-90, 90), 2)),
                priority=priority,
                battery_cost=round(self._rng.uniform(3, 15), 2),
                storage_cost=round(self._rng.uniform(2, 10), 2),
            ))
        return tasks

    def _find_satellite(self, sat_id: str) -> Optional[Satellite]:
        return next((s for s in self.satellites if s.id == sat_id), None)

    def _find_task(self, task_id: str) -> Optional[Task]:
        return next((t for t in self.tasks if t.id == task_id), None)

    @staticmethod
    def _distance(a: Tuple[float, float], b: Tuple[float, float]) -> float:
        return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
