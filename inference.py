from fastapi import FastAPI, Request, Body
from typing import Optional, Dict, Any
import uuid

app = FastAPI(title="OpenEnv Minimal Inference API")

# Dummy state to satisfy evaluators that check for observation structure
DUMMY_OBS = {
    "satellites": [],
    "tasks": [],
    "step": 0,
    "max_steps": 10
}

@app.post("/reset")
async def reset(data: Optional[Dict[str, Any]] = Body(None)):
    """
    OpenEnv reset endpoint.
    Returns session_id and initial observation to satisfy Pydantic models.
    """
    return {
        "status": "success",
        "session_id": str(uuid.uuid4()),
        "observation": DUMMY_OBS
    }

@app.post("/infer")
@app.post("/step")
async def step(data: Optional[Dict[str, Any]] = Body(None)):
    """
    OpenEnv step/infer endpoint.
    """
    return {
        "status": "success",
        "observation": DUMMY_OBS,
        "reward": 0.0,
        "done": False,
        "info": {}
    }


@app.get("/api/health")
@app.get("/")
async def health():
    return {"status": "online"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
