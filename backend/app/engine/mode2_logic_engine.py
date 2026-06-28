import random
import hashlib
import uuid
from typing import Dict, Any
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config.settings import settings

GATE_TYPES = ["AND", "OR", "NAND", "NOR", "XOR", "XNOR"]

def apply_gate(gate_type: str, in1: str, in2: str) -> str:
    """Evaluates a logic gate for binary strings."""
    length = max(len(in1), len(in2))
    in1 = in1.zfill(length)
    in2 = in2.zfill(length)
    
    out_chars = []
    for b1, b2 in zip(in1, in2):
        v1, v2 = int(b1), int(b2)
        if gate_type == "AND":
            res = v1 & v2
        elif gate_type == "OR":
            res = v1 | v2
        elif gate_type == "NAND":
            res = ~(v1 & v2) & 1
        elif gate_type == "NOR":
            res = ~(v1 | v2) & 1
        elif gate_type == "XOR":
            res = v1 ^ v2
        elif gate_type == "XNOR":
            res = ~(v1 ^ v2) & 1
        else:
            raise ValueError(f"Unknown gate type: {gate_type}")
        
        out_chars.append(str(res))
        
    return "".join(out_chars)

def evaluate_circuit(circuit_data: Dict[str, Any]) -> str:
    """Evaluates the whole Mode 2 circuit."""
    values = dict(circuit_data["inputs"])
    
    final_output = ""
    for gate in circuit_data["gates"]:
        in1_val = values.get(gate["inputs"][0])
        in2_val = values.get(gate["inputs"][1])
        
        if in1_val is None or in2_val is None:
            raise ValueError(f"Missing input for gate {gate['id']}")
            
        out_val = apply_gate(gate["type"], in1_val, in2_val)
        out_id = gate["id"].replace("G", "Out")
        values[out_id] = out_val
        final_output = out_val
        
    return final_output

def generate_circuit_from_topology(topology: Dict[str, Any]) -> Dict[str, Any]:
    """Generates a circuit from a topology by injecting random gates and inputs."""
    circuit = {"inputs": {}, "gates": []}
    bit_width = 1
    
    input_names = set()
    for g in topology["gates"]:
        for inp in g["inputs"]:
            if inp.startswith("In"):
                input_names.add(inp)
                
    for inp in input_names:
        val = "".join(random.choice(["0", "1"]) for _ in range(bit_width))
        circuit["inputs"][inp] = val
        
    for g in topology["gates"]:
        new_gate = dict(g)
        new_gate["type"] = random.choice(GATE_TYPES)
        circuit["gates"].append(new_gate)
        
    return circuit

def _hash_answer(answer: str, nonce: str) -> str:
    """Hashes the answer with a nonce and the app secret key."""
    secret = settings.JWT_SECRET_KEY.get_secret_value()
    payload = f"{answer}:{nonce}:{secret}".encode('utf-8')
    return hashlib.sha256(payload).hexdigest()

def generate_question_payload(topology: Dict[str, Any]) -> Dict[str, Any]:
    """Generates a circuit, evaluates it, and signs the hashed answer using JWT."""
    circuit = generate_circuit_from_topology(topology)
    correct_answer = evaluate_circuit(circuit)
    
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
        "token": token
    }

def verify_answer(user_answer: str, token: str) -> bool:
    """Verifies the user's Mode 2 answer against the signed JWT token."""
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
            
        user_hash = _hash_answer(str(user_answer), nonce)
        return user_hash == expected_hash
    except Exception:
        return False
