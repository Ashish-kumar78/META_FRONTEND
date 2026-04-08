"""
Graders for all 3 task difficulty levels.
All scores are normalized to [0.0, 1.0].
Grading is deterministic — same input always produces same score.
"""

from typing import Dict, List


def grade_easy(final_state: Dict) -> Dict:
    """Task 1 — Easy: Score = tasks_completed / total_tasks"""
    tasks = final_state.get("tasks", [])
    total = len(tasks)
    if total == 0:
        return {"score": 0.0, "breakdown": {}}
    completed = sum(1 for t in tasks if t["completed"])
    score = round(completed / total, 4)
    return {
        "score": score,
        "breakdown": {
            "tasks_completed": completed,
            "total_tasks": total,
            "completion_rate": score,
        },
    }


def grade_medium(final_state: Dict) -> Dict:
    """Task 2 — Medium: Score = 0.5*task_completion + 0.3*battery_efficiency + 0.2*storage_efficiency"""
    tasks = final_state.get("tasks", [])
    satellites = final_state.get("satellites", [])

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t["completed"])
    task_score = completed_tasks / total_tasks if total_tasks > 0 else 0.0

    active_sats = [s for s in satellites if s["active"]]
    battery_score = (sum(s["battery"] for s in active_sats) / len(active_sats) / 100.0) if active_sats else 0.0

    storage_score = (sum(1 for s in satellites if s["storage_used"] < 80) / len(satellites)) if satellites else 0.0

    score = round(max(0.0, min(1.0, 0.5 * task_score + 0.3 * battery_score + 0.2 * storage_score)), 4)
    return {
        "score": score,
        "breakdown": {
            "task_completion": round(task_score, 4),
            "battery_efficiency": round(battery_score, 4),
            "storage_efficiency": round(storage_score, 4),
            "tasks_completed": completed_tasks,
            "total_tasks": total_tasks,
        },
    }


def grade_hard(final_state: Dict) -> Dict:
    """Task 3 — Hard: Score = 0.5*disaster_coverage + 0.3*task_completion + 0.2*resource_efficiency"""
    tasks = final_state.get("tasks", [])
    satellites = final_state.get("satellites", [])

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t["completed"])
    task_completion = completed_tasks / total_tasks if total_tasks > 0 else 0.0

    disaster_tasks = [t for t in tasks if t.get("disaster_related")]
    if disaster_tasks:
        disaster_done = sum(1 for t in disaster_tasks if t["completed"])
        disaster_coverage = disaster_done / len(disaster_tasks)
    else:
        disaster_coverage = 1.0

    active_sats = [s for s in satellites if s["active"]]
    if active_sats:
        resource_efficiency = sum((s["battery"] / 100.0) * (1 - s["storage_used"] / 100.0) for s in active_sats) / len(active_sats)
    else:
        resource_efficiency = 0.0

    score = round(max(0.0, min(1.0, 0.5 * disaster_coverage + 0.3 * task_completion + 0.2 * resource_efficiency)), 4)
    return {
        "score": score,
        "breakdown": {
            "disaster_coverage": round(disaster_coverage, 4),
            "task_completion": round(task_completion, 4),
            "resource_efficiency": round(resource_efficiency, 4),
            "disaster_tasks_total": len(disaster_tasks),
            "disaster_tasks_done": sum(1 for t in disaster_tasks if t["completed"]),
            "tasks_completed": completed_tasks,
            "total_tasks": total_tasks,
            "active_satellites": len(active_sats),
        },
    }


GRADERS = {"easy": grade_easy, "medium": grade_medium, "hard": grade_hard}


def grade(difficulty: str, final_state: Dict) -> Dict:
    """Unified grader entry point."""
    grader_fn = GRADERS.get(difficulty)
    if grader_fn is None:
        raise ValueError(f"Unknown difficulty: {difficulty}")
    result = grader_fn(final_state)
    assert 0.0 <= result["score"] <= 1.0, "Score must be in [0.0, 1.0]"
    return result
