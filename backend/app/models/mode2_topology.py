from typing import Any, Dict
from sqlmodel import Field, SQLModel, JSON

class Mode2CircuitTopology(SQLModel, table=True):
    """Model for storing the wiring topology of a Mode 2 circuit."""
    id: int | None = Field(default=None, primary_key=True)
    difficulty: str = Field(index=True)
    num_gates: int = Field(index=True)
    topology_data: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
