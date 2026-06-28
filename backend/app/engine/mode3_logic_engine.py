"""Mode 3 Crossword Logic Puzzle Engine."""

import random
import copy
from typing import Dict, Any, List, Tuple

from app.engine.mode2_logic_engine import apply_gate, GATE_TYPES


def _evaluate_circuit(cells: List[Dict[str, Any]], connections: List[Dict[str, Any]]) -> Dict[str, str]:
    """Evaluates the circuit given cells and connections."""
    in_edges = {c["id"]: [] for c in cells}
    for conn in connections:
        in_edges[conn["to"]].append(conn["from"])

    values: Dict[str, str] = {}
    cell_dict = {c["id"]: c for c in cells}

    def get_val(cid: str, visited: set) -> str:
        if cid in values:
            return values[cid]
        if cid in visited:
            raise ValueError("Cycle detected in circuit")

        visited.add(cid)
        cell = cell_dict[cid]

        if cell["type"] == "VALUE":
            if not in_edges[cid]:
                val = cell["value"]
            else:
                if len(in_edges[cid]) != 1:
                    raise ValueError(f"Value cell {cid} must have exactly 0 or 1 incoming edges.")
                val = get_val(in_edges[cid][0], visited)
        elif cell["type"] == "GATE":
            if len(in_edges[cid]) != 2:
                raise ValueError(f"Gate cell {cid} must have exactly 2 incoming edges.")
            in1 = get_val(in_edges[cid][0], visited)
            in2 = get_val(in_edges[cid][1], visited)
            if not cell.get("value"):
                raise ValueError(f"Gate cell {cid} has no value assigned.")
            val = apply_gate(cell["value"], in1, in2)
        else:
            raise ValueError(f"Unknown cell type: {cell['type']}")

        values[cid] = val
        visited.remove(cid)
        return val

    for c in cells:
        if c["id"] not in values:
            get_val(c["id"], set())

    return values


def evaluate_mode3_solution(puzzle_data: Dict[str, Any], user_answers: Dict[str, str]) -> bool:
    """Evaluates a user's solution."""
    cells = copy.deepcopy(puzzle_data["cells"])
    
    for cell in cells:
        if not cell["is_static"]:
            ans = user_answers.get(cell["id"])
            if not ans:
                return False
            cell["value"] = ans
            
    try:
        computed_values = _evaluate_circuit(cells, puzzle_data["connections"])
    except ValueError:
        return False
        
    in_edges = {c["id"]: [] for c in cells}
    for conn in puzzle_data["connections"]:
        in_edges[conn["to"]].append(conn["from"])
        
    for cell in cells:
        if cell["type"] == "VALUE" and cell["is_static"] and in_edges[cell["id"]]:
            if computed_values[cell["id"]] != cell["value"]:
                return False
                
    return True


def _get_templates() -> List[Dict[str, Any]]:
    """Returns a list of predefined templates."""
    t1_cells = [
        {"id": "c00", "x": 0, "y": 0, "type": "VALUE"},
        {"id": "c10", "x": 1, "y": 0, "type": "GATE"},
        {"id": "c20", "x": 2, "y": 0, "type": "VALUE"},
        {"id": "c11", "x": 1, "y": 1, "type": "VALUE"},
        {"id": "c02", "x": 0, "y": 2, "type": "VALUE"},
        {"id": "c12", "x": 1, "y": 2, "type": "GATE"},
        {"id": "c22", "x": 2, "y": 2, "type": "VALUE"},
    ]
    t1_conns = [
        {"from": "c00", "to": "c10"}, {"from": "c11", "to": "c10"}, {"from": "c10", "to": "c20"},
        {"from": "c02", "to": "c12"}, {"from": "c11", "to": "c12"}, {"from": "c12", "to": "c22"},
    ]

    t2_cells = [
        {"id": "c00", "x": 0, "y": 0, "type": "VALUE"},
        {"id": "c01", "x": 0, "y": 1, "type": "VALUE"},
        {"id": "c10", "x": 1, "y": 0, "type": "GATE"},
        {"id": "c20", "x": 2, "y": 0, "type": "GATE"},
        {"id": "c21", "x": 2, "y": 1, "type": "VALUE"},
        {"id": "c30", "x": 3, "y": 0, "type": "VALUE"},
        {"id": "c12", "x": 1, "y": 2, "type": "VALUE"},
        {"id": "c22", "x": 2, "y": 2, "type": "GATE"},
        {"id": "c32", "x": 3, "y": 2, "type": "VALUE"},
    ]
    t2_conns = [
        {"from": "c00", "to": "c10"}, {"from": "c01", "to": "c10"},
        {"from": "c10", "to": "c20"}, {"from": "c21", "to": "c20"},
        {"from": "c20", "to": "c30"},
        {"from": "c10", "to": "c22"}, {"from": "c12", "to": "c22"},
        {"from": "c22", "to": "c32"},
    ]
    
    t3_cells = [
        {"id": "in_a", "x": 0, "y": 0, "type": "VALUE"},
        {"id": "in_b", "x": 0, "y": 2, "type": "VALUE"},
        {"id": "in_c", "x": 0, "y": 4, "type": "VALUE"},
        
        {"id": "g1", "x": 1, "y": 1, "type": "GATE"},
        {"id": "g2", "x": 1, "y": 3, "type": "GATE"},
        
        {"id": "mid1", "x": 2, "y": 1, "type": "VALUE"},
        {"id": "mid2", "x": 2, "y": 3, "type": "VALUE"},
        
        {"id": "g3", "x": 3, "y": 2, "type": "GATE"},
        {"id": "out", "x": 4, "y": 2, "type": "VALUE"},
        
        {"id": "g4", "x": 3, "y": 0, "type": "GATE"},
        {"id": "out2", "x": 4, "y": 0, "type": "VALUE"},
        
        {"id": "in_d", "x": 2, "y": 0, "type": "VALUE"},
    ]
    t3_conns = [
        {"from": "in_a", "to": "g1"}, {"from": "in_b", "to": "g1"},
        {"from": "in_b", "to": "g2"}, {"from": "in_c", "to": "g2"},
        {"from": "g1", "to": "mid1"}, {"from": "g2", "to": "mid2"},
        {"from": "mid1", "to": "g3"}, {"from": "mid2", "to": "g3"},
        {"from": "g3", "to": "out"},
        {"from": "in_d", "to": "g4"}, {"from": "mid1", "to": "g4"},
        {"from": "g4", "to": "out2"},
    ]

    return [
        {"width": 3, "height": 3, "cells": t1_cells, "connections": t1_conns},
        {"width": 4, "height": 4, "cells": t2_cells, "connections": t2_conns},
        {"width": 5, "height": 5, "cells": t3_cells, "connections": t3_conns},
    ]


def generate_puzzle(difficulty: str = "MEDIUM") -> Dict[str, Any]:
    """Generates a complete Mode 3 puzzle using templates."""
    template = copy.deepcopy(random.choice(_get_templates()))
    
    bit_width = 2
    
    in_edges = {c["id"]: [] for c in template["cells"]}
    for conn in template["connections"]:
        in_edges[conn["to"]].append(conn["from"])
        
    for cell in template["cells"]:
        if cell["type"] == "VALUE" and not in_edges[cell["id"]]:
            val = "".join(random.choice(["0", "1"]) for _ in range(bit_width))
            cell["value"] = val
        elif cell["type"] == "GATE":
            cell["value"] = random.choice(GATE_TYPES)
            
    computed = _evaluate_circuit(template["cells"], template["connections"])
    for cell in template["cells"]:
        if cell["type"] == "VALUE" and in_edges[cell["id"]]:
            cell["value"] = computed[cell["id"]]
            
    total_punchable = [c for c in template["cells"] if not (c["type"] == "VALUE" and in_edges[c["id"]])] 
    
    if difficulty == "HARD": holes_count = max(5, len(total_punchable) - 2)
    elif difficulty == "EASY": holes_count = min(3, len(total_punchable) - 1)
    else: holes_count = min(4, len(total_punchable) - 1)
    
    holes_count = min(holes_count, len(total_punchable))
    punched_cells = random.sample(total_punchable, holes_count)
    
    inventory_items = []
    
    for cell in template["cells"]:
        cell["is_static"] = True
        cell["expected_value"] = cell.get("value")
        
    for cell in punched_cells:
        cell["is_static"] = False
        inventory_items.append({"type": cell["type"], "value": cell["value"]})
        cell["value"] = None
        
    inventory = []
    for item in inventory_items:
        existing = next((i for i in inventory if i["type"] == item["type"] and i["value"] == item["value"]), None)
        if existing:
            existing["quantity"] += 1
        else:
            inventory.append({"type": item["type"], "value": item["value"], "quantity": 1})
            
    random.shuffle(inventory)
    
    num_gates = sum(1 for c in template["cells"] if c["type"] == "GATE")
            
    return {
        "metadata": {
            "grid_width": template["width"],
            "grid_height": template["height"],
            "num_gates": num_gates,
            "num_holes": holes_count,
            "bit_width": bit_width,
        },
        "puzzle_data": {
            "grid": {"width": template["width"], "height": template["height"]},
            "cells": template["cells"],
            "connections": template["connections"],
            "inventory": inventory
        }
    }
