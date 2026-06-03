import pytest
  from httpx import AsyncClient
  from app.main import app

  @pytest.mark.asyncio
  async def test_health_check():
      async with AsyncClient(app=app, base_url="http://test") as ac:
          response = await ac.get("/")
          assert response.status_code == 200
          data = response.json()
          assert data["status"] == "healthy"

  @pytest.mark.asyncio
  async def test_telemetry_payload_validation_success():
      # Note: This tests the route parser constraints. Database inserts would fail without active database,
      # but we can verify Pydantic structure checks.
      async with AsyncClient(app=app, base_url="http://test") as ac:
          # Incorrect attempts (must be > 0)
          response = await ac.post("/api/submission-event", json={
              "problem": "two-sum",
              "solveTime": 300,
              "attempts": 0,
              "status": "accepted"
          })
          assert response.status_code == 422
          assert "attempts" in response.text

          # Incorrect solveTime (must be > 0)
          response = await ac.post("/api/submission-event", json={
              "problem": "two-sum",
              "solveTime": -10,
              "attempts": 1,
              "status": "accepted"
          })
          assert response.status_code == 422
          assert "solveTime" in response.text

          # Missing required field 'problem'
          response = await ac.post("/api/submission-event", json={
              "solveTime": 100,
              "attempts": 1,
              "status": "accepted"
          })
          assert response.status_code == 422
