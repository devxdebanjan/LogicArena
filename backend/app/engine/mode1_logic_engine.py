import random
import uuid
from typing import Dict, Any
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config.settings import settings
from app.engine.mode2_logic_engine import GATE_TYPES, apply_gate, generate_circuit_from_topology, _hash_answer

def evaluate_circuit_full(circuit_data: Dict[str, Any], buggy_gate_id: str | None = None) -> Dict[str, str]:
    """Evaluates the whole circuit and returns a dictionary of all wire values."""
    values = dict(circuit_data["inputs"])
    
    for gate in circuit_data["gates"]:
        in1_val = values.get(gate["inputs"][0])
        in2_val = values.get(gate["inputs"][1])
        
        if in1_val is None or in2_val is None:
            raise ValueError(f"Missing input for gate {gate['id']}")
            
        out_val = apply_gate(gate["type"], in1_val, in2_val)
        
        if gate["id"] == buggy_gate_id:
            idx = random.randint(0, len(out_val) - 1)
            flipped = "1" if out_val[idx] == "0" else "0"
            out_val = out_val[:idx] + flipped + out_val[idx+1:]
            
        out_id = gate["id"].replace("G", "Out")
        values[out_id] = out_val
        
    return values

def generate_question_payload(topology: Dict[str, Any]) -> Dict[str, Any]:
    """Generates a circuit, evaluates it, injects a single bug, and signs the buggy gate's ID."""
    circuit = generate_circuit_from_topology(topology)
    
    gates = circuit["gates"]
    if not gates:
        raise ValueError("Circuit topology must have at least one gate")
        
    buggy_gate = random.choice(gates)
    buggy_gate_id = buggy_gate["id"]
    
    wire_values = evaluate_circuit_full(circuit, buggy_gate_id=buggy_gate_id)
    correct_answer = buggy_gate_id
    
    nonce = uuid.uuid4().hex
    answer_hash = _hash_answer(correct_answer, nonce)
    
    now = datetime.now(timezone.utc)
    claims = {
        "nonce": nonce,
        "answer_hash": answer_hash,
        "iat": now,
        "exp": now + timedelta(minutes=5),
    }
    
    token = jwt.encode(
        claims,
        settings.JWT_SECRET_KEY.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )
    
    return {
        "circuit": circuit,
        "wire_values": wire_values,
        "token": token
    }

def verify_answer(user_answer: str, token: str) -> bool:
    """Verifies the user's Mode 1 answer against the signed JWT token."""
    try:
        data = jwt.decode(
            token,
            settings.JWT_SECRET_KEY.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
        )
        nonce = data.get("nonce")
        expected_hash = data.get("answer_hash")
        
        if not nonce or not expected_hash:
            return False
            
        user_hash = _hash_answer(str(user_answer).upper(), nonce)
        return user_hash == expected_hash
    except Exception:
        return False
