# 🛰️ Satellite Scheduling RL Environment

> **OpenEnv Hackathon Submission**  
> An RL environment where agents manage real-world satellite fleets under constraints: disasters, resource limits, weather events, and role-based scheduling.

[![OpenEnv Compliant](https://img.shields.io/badge/OpenEnv-Compliant-00f0ff?style=flat-square)]()
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?style=flat-square)]()
[![React](https://img.shields.io/badge/React-18-blue?style=flat-square)]()

---

## 🌍 Environment Description & Motivation

Satellite fleet management is a **real-world AI scheduling problem** used by space agencies (NASA, ISRO, ESA) every day. Ground operators must decide:
- Which satellite executes which observation task
- When to switch satellite roles (commander → executor)
- How to prioritize disaster response when earthquakes, floods, or wildfires are detected
- How to manage battery depletion and storage constraints across the fleet

This environment simulates exactly that challenge. An RL agent must learn to:
1. **Allocate tasks** to satellites based on their role and remaining resources
2. **Respond to disasters** by deprioritizing routine tasks and covering emergency zones
3. **Survive chaos** — solar flares drain batteries, storms reduce efficiency, comms overload occurs

---

## 🗂️ Project Structure

```
├── backend/
│   ├── env.py                # Core RL Environment (OpenEnv-compatible)
│   ├── models.py             # Pydantic typed models (Observation, Action, Reward)
│   ├── graders.py            # Deterministic graders (0.0–1.0) for all 3 tasks
│   ├── main.py               # FastAPI REST API
│   ├── baseline_agent.py     # Greedy heuristic baseline agent
│   ├── openai_baseline.py    # LLM baseline (OpenAI API)
│   └── requirements.txt
├── src/                      # React + Vite frontend dashboard
├── openenv.yaml              # OpenEnv metadata spec
├── Dockerfile
└── README.md
```

---

## 👁️ Observation Space

Each call to `reset()` and `step()` returns a typed `Observation`:

```python
class Observation(BaseModel):
    satellites: List[SatelliteObservation]   # Fleet status
    tasks:      List[TaskObservation]         # Task queue
    weather:    WeatherCondition              # clear | storm | solar_flare | overload
    disaster_active: bool                     # Active disaster event
    disaster_sector: Optional[List[float]]   # [lon, lat] of disaster zone
    step:       int                           # Current step
    max_steps:  int                           # Episode length
    total_reward: float                       # Cumulative reward
```

**Satellite fields:** `id`, `battery` (0–100%), `position` ([lon,lat]), `role` (planner|executor), `active`, `tasks_completed`, `storage_used` (0–100%)

**Task fields:** `id`, `location`, `priority` (low|medium|high|critical), `battery_cost`, `storage_cost`, `assigned_to`, `completed`, `disaster_related`

---

## 🕹️ Action Space

```python
Action = Union[AssignTaskAction, ChangeRoleAction, MoveSatelliteAction, SkipAction]
```

| Action | Parameters | Description |
|---|---|---|
| `assign_task` | `satellite_id`, `task_id` | Assign task to an executor satellite |
| `change_role` | `satellite_id` | Toggle satellite between planner↔executor |
| `move_satellite` | `satellite_id`, `direction` (N/S/E/W) | Reposition satellite |
| `skip` | — | Do nothing (small penalty) |

---

## 🎯 Tasks & Graders

### Task 1 — Easy (5 satellites, 10 tasks, 30 steps)
**Objective:** Complete as many satellite tasks as possible.  
**Score formula:** `tasks_completed / total_tasks`  
**Constraints:** No chaos events, no disasters.

### Task 2 — Medium (7 satellites, 20 tasks, 50 steps)
**Objective:** Balance task completion with resource efficiency.  
**Score formula:** `0.5×task_completion + 0.3×battery_efficiency + 0.2×storage_efficiency`  
**Constraints:** Weather events (10% chance/step), occasional chaos (5%).

### Task 3 — Hard (10 satellites, 35 tasks, 80 steps)
**Objective:** Coordinate disaster response while maintaining fleet efficiency.  
**Score formula:** `0.5×disaster_coverage + 0.3×task_completion + 0.2×resource_efficiency`  
**Constraints:** Active disasters (25% trigger rate), solar flares (15% chaos), role switching required.

All scores: **deterministic, 0.0–1.0.**

---

## 💰 Reward Function

| Event | Reward |
|---|---|
| LOW priority task completed | +0.5 |
| MEDIUM priority task completed | +1.0 |
| HIGH priority task completed | +1.5 |
| CRITICAL task completed | +2.5 |
| Disaster response bonus | +2.0 |
| Invalid action (wrong role, low battery, etc.) | −0.1 to −0.3 |
| Skip step | −0.05 |

Reward provides **partial progress signals** throughout the episode — not just terminal reward — making it suitable for policy gradient and Q-learning agents.

---

## 📊 Baseline Scores

Reproducible scores using the greedy heuristic agent (`baseline_agent.py`, seed=42):

| Difficulty | Score | Tasks Done | Notes |
|---|---|---|---|
| **Easy** | **1.0000** | 10/10 | Perfect completion, no constraints |
| **Medium** | **~0.87** | 20/20 | Battery/storage efficiency drops score |
| **Hard** | **~0.89** | 35/35 | Disaster coverage ≥ 80% |

> **Beat these scores with your RL agent!** Any agent scoring above greedy baseline demonstrates learning.

Run to reproduce:
```bash
cd backend
python baseline_agent.py
```

---

## 🚀 Setup & Usage

### Prerequisites
- Python 3.11+
- Node.js 20+

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API docs at: http://localhost:8000/docs
```

### Frontend Dashboard
```bash
npm install
npm run dev
# Dashboard at: http://localhost:5173
```

### Baseline Agent (Greedy)
```bash
cd backend
python baseline_agent.py
```

### Baseline Agent (OpenAI LLM)
```bash
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o-mini   # optional, default: gpt-3.5-turbo
cd backend
python openai_baseline.py
```

### Validate OpenEnv Compliance
```bash
# Via API:
curl http://localhost:8000/validate
# Returns: {"validation_status": "PASS", "openenv_compliant": true, ...}
```

---

## 🐳 Docker

```bash
# Build and run (serves both API + frontend)
docker build -t satellite-env .
docker run -p 7860:7860 satellite-env

# API: http://localhost:7860
# Docs: http://localhost:7860/docs
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check + version |
| `POST` | `/reset` | Start new episode (`difficulty`, `seed`) |
| `POST` | `/step` | Execute one action |
| `GET` | `/state/{session_id}` | Get current state |
| `POST` | `/grade/{session_id}` | Grade current session (0.0–1.0) |
| `GET` | `/demo/{difficulty}` | Run full greedy demo |
| `GET` | `/validate` | OpenEnv compliance check |
| `GET` | `/leaderboard` | Baseline scores for all difficulties |
| `GET` | `/stats` | Session statistics |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/redoc` | ReDoc documentation |

---

## 🏛️ OpenEnv Compliance

This environment implements the full OpenEnv spec:

- ✅ Typed `Observation`, `Action`, `Reward` Pydantic models (`models.py`)
- ✅ `step(action)` → `(observation, reward, done, info)`
- ✅ `reset()` → initial observation
- ✅ `state()` → current state (via `get_state()`)
- ✅ `openenv.yaml` metadata file
- ✅ Deterministic graders for all 3 tasks
- ✅ Scores strictly in [0.0, 1.0]
- ✅ Reproducible baseline via `baseline_agent.py`
- ✅ OpenAI API baseline via `openai_baseline.py`
- ✅ Working `Dockerfile` (HuggingFace Spaces port 7860)

---

## 👨‍💻 Author

Built for the **OpenEnv Hackathon** by Ashish Kumar.

Real-world motivation: Satellite task scheduling is a multi-agent constrained optimization problem with real operational value in disaster management, Earth observation, and space infrastructure.
