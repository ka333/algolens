from pydantic import BaseModel, Field

class SubmissionEventCreate(BaseModel):
    problem: str = Field(..., min_length=1, description="Slug of the LeetCode problem")
    solveTime: int = Field(..., gt=0, description="Solve duration in seconds")
    attempts: int = Field(..., gt=0, description="Attempts count until solved")
    status: str = Field(..., min_length=1, description="Status of submission, e.g. 'accepted'")
    difficulty: str = Field("Unknown", description="Optional difficulty mapping (Easy, Medium, Hard)")

    class Config:
        json_schema_extra = {
            "example": {
                "problem": "two-sum",
                "solveTime": 380,
                "attempts": 2,
                "status": "accepted",
                "difficulty": "Easy"
            }
        }
