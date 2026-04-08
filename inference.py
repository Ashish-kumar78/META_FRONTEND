"""
inference.py
============
Official OpenEnv inference script for the Satellite Scheduling RL Environment.
Uses the OpenAI client with API_BASE_URL, MODEL_NAME, and HF_TOKEN env vars.

Usage:
    export API_BASE_URL=https://api.openai.com/v1
    export MODEL_NAME=gpt-3.5-turbo
    export HF_TOKEN=sk-...
    python inference.py

Strictly emits [START], [STEP], and [END] structured stdout logs.
"""

import os
import sys
import json
import time

# ── Auto-load .env file ───────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass  # dotenv optional; vars can also be set manually in shell

# ── Validate required env vars ────────────────────────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL", "https://api.openai.com/v1")
MODEL_NAME   = os.getenv("MODEL_NAME", "gpt-3.5-turbo")
HF_TOKEN     = os.getenv("HF_TOKEN")

if not HF_TOKEN:
    print("[ERROR] HF_TOKEN environment variable is not set.", flush=True)
    print("        export HF_TOKEN=sk-...", flush=True)
    sys.exit(1)


# ── OpenAI Client setup (mandatory per spec) ───────────────────────────────────
try:
    from openai import OpenAI
    client = OpenAI(api_key=HF_TOKEN, base_url=API_BASE_URL)
except ImportError:
    print("[ERROR] openai package not installed. Run: pip install openai", flush=True)
    sys.exit(1)

# ── Add backend to path so we can import the env directly ─────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from env import SatelliteSchedulingEnv
from graders import grade

# ── LLM Agent ─────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert satellite fleet coordinator AI.
Manage a fleet of satellites to complete tasks under resource constraints.

Respond with ONLY ONE action in valid JSON. No explanation, no markdown.

Available actions:
- {"type": "assign_task", "satellite_id": "SAT-001", "task_id": "TASK-001"}
- {"type": "change_role", "satellite_id": "SAT-001"}
- {"type": "skip"}

Rules:
1. Only EXECUTOR satellites can be assigned tasks.
2. Satellite battery must be >= task battery_cost.
3. storage_used + storage_cost must be <= 100.
4. Prioritize CRITICAL and disaster_related tasks.
"""


def llm_agent_action(observation: dict) -> dict:
    """Query the LLM for the next action given the observation."""
    obs_summary = {
        "step": observation["step"],
        "max_steps": observation["max_steps"],
        "weather": observation["weather"],
        "disaster_active": observation["disaster_active"],
        "satellites": [
            {"id": s["id"], "battery": round(s["battery"], 1),
             "role": s["role"], "active": s["active"],
             "storage_used": round(s["storage_used"], 1)}
            for s in observation["satellites"] if s["active"]
        ],
        "pending_tasks": [
            {"id": t["id"], "priority": t["priority"],
             "battery_cost": t["battery_cost"], "storage_cost": t["storage_cost"],
             "disaster_related": t["disaster_related"]}
            for t in observation["tasks"]
            if not t["completed"] and not t["assigned_to"]
        ][:8],
    }
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"State:\n{json.dumps(obs_summary)}\nAction?"},
            ],
            temperature=0.1,
            max_tokens=100,
        )
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        return {"type": "skip"}


# ── Main Inference Loop ────────────────────────────────────────────────────────
def run_task(difficulty: str, seed: int = 42) -> dict:
    env = SatelliteSchedulingEnv(difficulty=difficulty, seed=seed)
    obs = env.reset()

    print(json.dumps({
        "event": "[START]",
        "task": difficulty,
        "model": MODEL_NAME,
        "seed": seed,
        "max_steps": obs["max_steps"],
        "num_satellites": len(obs["satellites"]),
        "num_tasks": len(obs["tasks"]),
    }), flush=True)

    done = False
    total_reward = 0.0
    step_num = 0

    while not done:
        action = llm_agent_action(obs)
        obs, reward, done, info = env.step(action)
        total_reward += reward
        step_num += 1

        print(json.dumps({
            "event": "[STEP]",
            "task": difficulty,
            "step": step_num,
            "action_type": action.get("type", "unknown"),
            "reward": round(reward, 4),
            "total_reward": round(total_reward, 4),
            "done": done,
        }), flush=True)

    final_state = env.get_state()
    result = grade(difficulty, final_state)
    score = result["score"]

    print(json.dumps({
        "event": "[END]",
        "task": difficulty,
        "model": MODEL_NAME,
        "seed": seed,
        "steps": step_num,
        "total_reward": round(total_reward, 4),
        "score": round(score, 4),
        "score_in_range": 0.0 <= score <= 1.0,
        "breakdown": result.get("breakdown", {}),
    }), flush=True)

    return {"difficulty": difficulty, "score": score, "steps": step_num, "total_reward": round(total_reward, 4)}


def main():
    seed = int(os.environ.get("BASELINE_SEED", "42"))
    difficulties = ["easy", "medium", "hard"]
    results = []

    for diff in difficulties:
        try:
            r = run_task(diff, seed=seed)
            results.append(r)
        except Exception as e:
            print(json.dumps({"event": "[END]", "task": diff, "error": str(e), "score": 0.0}), flush=True)

    # Final summary
    print("\n=== INFERENCE SUMMARY ===", flush=True)
    for r in results:
        bar = "█" * int(r["score"] * 20) + "░" * (20 - int(r["score"] * 20))
        print(f"  {r['difficulty'].upper():8s} [{bar}] {r['score']:.4f}", flush=True)

    # Save results
    with open("inference_results.json", "w") as f:
        json.dump({"model": MODEL_NAME, "seed": seed, "results": results}, f, indent=2)
    print("\nResults saved to inference_results.json", flush=True)


if __name__ == "__main__":
    main()
