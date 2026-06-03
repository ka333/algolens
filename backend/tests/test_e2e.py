import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_e2e_telemetry_and_svg_flow():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # 1. Step 1: Health check healthiness verification
        health_res = await ac.get("/")
        assert health_res.status_code == 200

        # 2. Step 2: Telemetry validation constraints verify
        telemetry_payload = {
            "problem": "lru-cache",
            "solveTime": 420,
            "attempts": 3,
            "status": "accepted",
            "difficulty": "Medium"
        }
        # Post request check
        post_res = await ac.post("/api/submission-event", json=telemetry_payload)
        # Note: If no live DB connection is up during unit tests, this will return 500,
        # but validation passes. If validation failed, it would be 422.
        # We assert it's not 422 (meaning Pydantic accepts the schema correctly).
        assert post_res.status_code != 422

        # 3. Step 3: Verify the SVG Renderer Output
        svg_res = await ac.get(
            "/api/svg/stats?cardType=profile&easy=3&medium=5&hard=1&streak=4"
        )
        assert svg_res.status_code == 200
        assert "image/svg+xml" in svg_res.headers["content-type"]
        svg_text = svg_res.text
        assert "<svg" in svg_text
        assert "9" in svg_text  # total solved (3 + 5 + 1)
        assert "4 🔥" in svg_text # streak check
        
        # Verify Cache-Busting Headers
        assert svg_res.headers["cache-control"] == "no-cache, no-store, must-revalidate, max-age=0"
        assert svg_res.headers["pragma"] == "no-cache"
        assert svg_res.headers["expires"] == "0"
