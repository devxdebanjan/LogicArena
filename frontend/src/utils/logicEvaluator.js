// Local Logic Evaluator Functions for logicarena

export function applyGate(gateType, in1, in2) {
  const len = Math.max(in1.length, in2.length);
  const pad1 = in1.padStart(len, '0');
  const pad2 = in2.padStart(len, '0');
  let out = '';
  for (let i = 0; i < len; i++) {
    const v1 = parseInt(pad1[i], 10);
    const v2 = parseInt(pad2[i], 10);
    let res;
    switch (gateType) {
      case 'AND': res = v1 & v2; break;
      case 'OR': res = v1 | v2; break;
      case 'NAND': res = (~(v1 & v2)) & 1; break;
      case 'NOR': res = (~(v1 | v2)) & 1; break;
      case 'XOR': res = v1 ^ v2; break;
      case 'XNOR': res = (~(v1 ^ v2)) & 1; break;
      default: res = 0; break;
    }
    out += res.toString();
  }
  return out;
}

export function evaluateMode2Circuit(circuit) {
  if (!circuit || !circuit.inputs || !circuit.gates) return null;
  const values = { ...circuit.inputs };
  let finalOutput = '';
  for (const gate of circuit.gates) {
    const in1 = values[gate.inputs[0]];
    const in2 = values[gate.inputs[1]];
    if (in1 === undefined || in2 === undefined) return null;
    const outVal = applyGate(gate.type, in1, in2);
    values[gate.id.replace('G', 'Out')] = outVal;
    finalOutput = outVal;
  }
  return finalOutput;
}

export function evaluateMode1BuggyGate(circuit) {
  if (!circuit || !circuit.gates || !circuit.wire_values) return null;
  const values = { ...circuit.wire_values };
  for (const gate of circuit.gates) {
    const in1 = values[gate.inputs[0]];
    const in2 = values[gate.inputs[1]];
    if (in1 === undefined || in2 === undefined) continue;
    const expectedOut = applyGate(gate.type, in1, in2);
    const outId = gate.id.replace('G', 'Out');
    const actualOut = values[outId];
    if (actualOut === undefined) continue;
    if (expectedOut !== actualOut) {
      return gate.id;
    }
  }
  return null;
}

export function evaluateMode3Crossword(puzzleData, userAnswers) {
  if (!puzzleData || !puzzleData.cells || !puzzleData.connections) return false;

  const cells = JSON.parse(JSON.stringify(puzzleData.cells));

  // Plug in user answers
  for (const cell of cells) {
    if (!cell.is_static) {
      const ans = userAnswers[cell.id];
      if (!ans) return false; // Missing answer
      cell.value = ans;
    }
  }

  // Build graph info
  const inEdges = {};
  for (const cell of cells) {
    inEdges[cell.id] = [];
  }
  for (const conn of puzzleData.connections) {
    if (inEdges[conn.to]) {
      inEdges[conn.to].push(conn.from);
    }
  }

  const values = {};
  const cellDict = {};
  for (const cell of cells) {
    cellDict[cell.id] = cell;
  }

  // Helper for topological evaluation
  function getVal(cid, visited) {
    if (values[cid] !== undefined) {
      return values[cid];
    }
    if (visited.has(cid)) {
      throw new Error("Cycle detected");
    }

    visited.add(cid);
    const cell = cellDict[cid];
    if (!cell) throw new Error("Cell not found");

    let val;
    if (cell.type === 'VALUE') {
      if (inEdges[cid].length === 0) {
        val = cell.value;
      } else {
        if (inEdges[cid].length !== 1) {
          throw new Error("Value cell must have exactly 1 incoming edge");
        }
        val = getVal(inEdges[cid][0], visited);
      }
    } else if (cell.type === 'GATE') {
      if (inEdges[cid].length !== 2) {
        throw new Error("Gate cell must have exactly 2 incoming edges");
      }
      const in1 = getVal(inEdges[cid][0], visited);
      const in2 = getVal(inEdges[cid][1], visited);
      if (!cell.value) {
        throw new Error("Gate has no value");
      }
      val = applyGate(cell.value, in1, in2);
    } else {
      throw new Error("Unknown type");
    }

    values[cid] = val;
    visited.delete(cid);
    return val;
  }

  // Evaluate all cells
  try {
    for (const cell of cells) {
      if (values[cell.id] === undefined) {
        getVal(cell.id, new Set());
      }
    }
  } catch (e) {
    return false;
  }

  // Check if computed values match the locked output values
  for (const cell of cells) {
    if (cell.type === 'VALUE' && cell.is_static && inEdges[cell.id].length > 0) {
      if (values[cell.id] !== cell.value) {
        return false;
      }
    }
  }

  return true;
}
