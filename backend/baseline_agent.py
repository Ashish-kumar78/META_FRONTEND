"""
Baseline Agent — Greedy heuristic for benchmarking.
Provides a reference score. Any RL agent should beat this.
"""

from env import SatelliteSchedulingEnv
from graders import grade


def greedy_agent(env: SatelliteSchedulingEnv) -> dict:
    obs = env.reset()
    done = False
    priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}

    while not done:
        satellites = obs["satellites"]
        tasks = obs["tasks"]

        executors = [s for s in satellites if s["active"] and s["role"] == "executor" and s["battery"] > 5]
        pending = sorted(
            [t for t in tasks if not t["completed"] and not t["assigned_to"]],
            key=lambda t: priority_order.get(t["priority"], 0),
            reverse=True,
        )

        action = {"type": "skip"}
        for executor in executors:
            for task in pending:
                if executor["battery"] >= task["battery_cost"] and executor["storage_used"] + task["storage_cost"] <= 100:
                    action = {"type": "assign_task", "satellite_id": executor["id"], "task_id": task["id"]}
                    break
            if action["type"] != "skip":
                break

        obs, reward, done, info = env.step(action)

    final_state = env.get_state()
    return grade(env.difficulty, final_state)


def run_baseline():
    print("=" * 60)
    print("BASELINE AGENT — GREEDY HEURISTIC")
    print("=" * 60)
    for diff in ["easy", "medium", "hard"]:
        env = SatelliteSchedulingEnv(difficulty=diff, seed=42)
        result = greedy_agent(env)
        print(f"\n[{diff.upper()}]")
        print(f"  Score     : {result['score']:.4f}")
        print(f"  Breakdown : {result['breakdown']}")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    run_baseline()
