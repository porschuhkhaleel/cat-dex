from typing import List

from pydantic import BaseModel, ConfigDict, Field


class IdentifyResponse(BaseModel):
    """
    Shape returned by POST /api/identify.

    `fun_facts` is aliased to `funFacts` so the JSON on the wire matches the
    camelCase the React frontend expects, while the Python side still gets
    to use snake_case.
    """

    model_config = ConfigDict(populate_by_name=True)

    breed: str
    confidence: float = Field(ge=0.0, le=1.0)
    fun_facts: List[str] = Field(alias="funFacts")
