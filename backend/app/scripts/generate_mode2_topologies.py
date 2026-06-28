import asyncio
import itertools
from sqlmodel import select
from app.config.database import async_session_factory
from app.models.mode2_topology import Mode2CircuitTopology

def generate_valid_topologies(n_gates: int):
    """Generates all fully connected, valid Mode 2 circuit topologies for N gates."""
    max_inputs = n_gates + 1
    input_pool = [f"In{i}" for i in range(1, max_inputs + 1)]
    
    valid_topologies = []
    
    if n_gates == 1:
        return [{"gates": [{"id": "G1", "inputs": ["In1", "In2"]}]}]
        
    def is_connected(gates):
        used_outputs = set()
        for g in gates:
            for inp in g["inputs"]:
                if inp.startswith("Out"):
                    used_outputs.add(inp)
        
        for i in range(1, len(gates)):
            if f"Out{i}" not in used_outputs:
                return False
        return True

    def is_normalized_inputs(gates):
        used_inputs = set()
        for g in gates:
            for inp in g["inputs"]:
                if inp.startswith("In"):
                    used_inputs.add(int(inp.replace("In", "")))
        
        if not used_inputs:
            return False
            
        max_used = max(used_inputs)
        return len(used_inputs) == max_used

    def build_gates(current_gates, k):
        if k > n_gates:
            if is_connected(current_gates) and is_normalized_inputs(current_gates):
                valid_topologies.append({"gates": current_gates})
            return
            
        sources = input_pool + [f"Out{i}" for i in range(1, k)]
        for src1, src2 in itertools.combinations_with_replacement(sources, 2):
            new_gate = {"id": f"G{k}", "inputs": [src1, src2]}
            build_gates(current_gates + [new_gate], k + 1)

    build_gates([{"id": "G1", "inputs": ["In1", "In2"]}], 2)
    return valid_topologies

def classify_difficulty(n_gates: int) -> str:
    if n_gates <= 2:
        return "easy"
    elif n_gates == 3:
        return "medium"
    else:
        return "hard"

async def async_main():
    print("Generating Mode 2 topologies...")
    topologies_to_insert = []
    
    for n in range(1, 5):
        tops = generate_valid_topologies(n)
        print(f"Generated {len(tops)} valid Mode 2 topologies for N={n}")
        difficulty = classify_difficulty(n)
        
        for t in tops:
            topologies_to_insert.append(
                Mode2CircuitTopology(
                    difficulty=difficulty,
                    num_gates=n,
                    topology_data=t
                )
            )
            
    print(f"Total Mode 2 topologies to insert: {len(topologies_to_insert)}")
    
    async with async_session_factory() as session:
        from sqlalchemy import text
        await session.execute(text(f"TRUNCATE TABLE {Mode2CircuitTopology.__tablename__} RESTART IDENTITY CASCADE;"))
            
        session.add_all(topologies_to_insert)
        await session.commit()
        print("Successfully saved Mode 2 topologies to database.")

def main():
    asyncio.run(async_main())

if __name__ == "__main__":
    main()
