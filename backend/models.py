from typing import List

from pydantic import BaseModel, ConfigDict, Field


class TriageResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    incident_type: str
    severity: str
    affected_services: List[str] = Field(default_factory=list)
    summary: str = ""


class CommsResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    channel: str = "#incidents"
    status: str = "Investigating"
    message: str = ""
