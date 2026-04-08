"""
openai_baseline.py
==================
Baseline inference script using the OpenAI API client.
Reads OPENAI_API_KEY from environment variables.
Runs an LLM-powered agent against all 3 difficulty levels and
produces reproducible baseline scores.

Usage:
    export OPENAI_API_KEY=sk-...
    cd backend
    python openai_baseline.py

Requirements:
    pip install openai
"""

import os
import json
import sys
from env import SatelliteSchedulingEnv
from graders import grade

# ── Check for OpenAI API key ─────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY environment variable is not set.")
    print("Usage: export OPENAI_API_KEY=sk-... && python openai_baseline.py")
    sys.exit(1)

try:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
except ImportError:
    print("ERROR: openai package not installed. Run: pip install openai")
    sys.exit(1)


SYSTEM_PROMPT = """You are an expert satellite fleet coordinator AI.
You manage a fleet of satellites to complete tasks under resource constraints.

You receive a JSON observation each turn and must respond with ONE action in JSON format.

Available actions:
- {"type": "assign_task", "satellite_id": "SAT-001", "task_id": "TASK-001"}  
  → Assign a task to an executor satellite. Only use active satellites with sufficient battery.
- {"type": "change_role", "satellite_id": "SAT-001"}
  → Switch satellite between planner and executor roles.
- {"type": "skip"}
  → Skip this step (small penalty).

Rules:
1. Only EXECUTOR satellites can be assigned tasks.
2. Satellite battery must be >= task battery_cost.
3. Satellite storage_used + task storage_cost must be <= 100.
4. Prioritize CRITICAL tasks, especially disaster_related ones.
5. Monitor battery — satellites with battery < 10 should not be assigned tasks.

Respond with ONLY valid JSON. No explanation, no markdown. Just the action JSON.
"""


def llm_agent_action(observation: dict, model: str = "gpt-3.5-turbo") -> dict:
    """Ask the LLM to pick the best action given the current observation."""
    obs_summary = {
        "weather": observation["weather"],
        "disaster_active": observation["disaster_active"],
        "step": observation["step"],
        "max_steps": observation["max_steps"],
        "satellites": [
            {
                "id": s["id"],
                "battery": round(s["battery"], 1),
                "role": s["role"],
                "active": s["active"],
                "storage_used": round(s["storage_used"], 1),
            }
            for s in observation["satellites"]
            if s["active"]
        ],
        "pending_tasks": [
            {
                "id": t["id"],
                "priority": t["priority"],
                "battery_cost": t["battery_cost"],
                "storage_cost": t["storage_cost"],
                "disaster_related": t["disaster_related"],
            }
            for t in observation["tasks"]
            if not t["completed"] and not t["assigned_to"]
        ][:10],  # Limit to top 10 to stay within context
    }

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Current state:\n{json.dumps(obs_summary, indent=2)}\n\nWhat action should the agent take?"},
            ],
            temperature=0.1,
            max_tokens=150,
        )
        action_text = response.choices[0].message.content.strip()
        # Strip markdown code blocks if present
        if action_text.startswith("```"):
            action_text = action_text.split("```")[1]
            if action_text.startswith("json"):
                action_text = action_text[4:]
        action = json.loads(action_text)
        return action
    except (json.JSONDecodeError, Exception) as e:
        print(f"  [LLM fallback] Error parsing action: {e}. Using skip.")
        return {"type": "skip"}


def run_openai_baseline(difficulty: str, seed: int = 42, model: str = "gpt-3.5-turbo") -> dict:
    """Run one full episode with the LLM agent on a given difficulty."""
    env = SatelliteSchedulingEnv(difficulty=difficulty, seed=seed)
    obs = env.reset()
    done = False
    steps = 0
    total_reward = 0.0

    print(f"\n  Running {model} on [{difficulty.upper()}] (seed={seed})...")

    while not done:
        action = llm_agent_action(obs, model=model)
        obs, reward, done, info = env.step(action)
        total_reward += reward
        steps += 1
        event = info.get("events", ["—"])[0] if info.get("events") else "—"
        print(f"    Step {steps:3d}: {action.get('type','?'):12s} | reward={reward:+.2f} | {event}")

    final_state = env.get_state()
    result = grade(difficulty, final_state)
    return {
        "difficulty": difficulty,
        "model": model,
        "seed": seed,
        "steps": steps,
        "total_reward": round(total_reward, 4),
        "score": result["score"],
        "breakdown": result["breakdown"],
    }


def main():
    model = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")
    seed = int(os.environ.get("BASELINE_SEED", "42"))

    print("=" * 70)
    print("  OPENENV BASELINE — LLM AGENT (OpenAI API)")
    print(f"  Model: {model} | Seed: {seed}")
    print("=" * 70)

    results = []
    for difficulty in ["easy", "medium", "hard"]:
        try:
            result = run_openai_baseline(difficulty, seed=seed, model=model)
            results.append(result)
            print(f"\n  [{difficulty.upper()}] Final Score: {result['score']:.4f}")
            print(f"  Breakdown: {result['breakdown']}")
        except Exception as e:
            print(f"\n  [{difficulty.upper()}] ERROR: {e}")

    print("\n" + "=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    for r in results:
        bar = "█" * int(r["score"] * 20) + "░" * (20 - int(r["score"] * 20))
        print(f"  {r['difficulty'].upper():8s} [{bar}] {r['score']:.4f}")

    print("\n  Baseline comparison (Greedy vs LLM):")
    greedy = {"easy": 1.0, "medium": 0.87, "hard": 0.66}
    for r in results:
        diff = r["score"] - greedy.get(r["difficulty"], 0)
        symbol = "▲" if diff >= 0 else "▼"
        print(f"  {r['difficulty'].upper():8s} LLM={r['score']:.4f} | Greedy={greedy.get(r['difficulty'], '?')} | {symbol} {abs(diff):.4f}")

    print("=" * 70)

    # Save results to JSON for reproducibility
    output_path = "baseline_results.json"
    with open(output_path, "w") as f:
        json.dump({"model": model, "seed": seed, "results": results}, f, indent=2)
    print(f"\n  Results saved to: {output_path}")


if __name__ == "__main__":
    main()
