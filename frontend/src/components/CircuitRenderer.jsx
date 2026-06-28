import { useMemo } from 'react';

const GATE_COLORS = {
  AND: '#6c7bf0',
  OR: '#4ecab4',
  NAND: '#f0884c',
  NOR: '#f06c7a',
  XOR: '#b07cf0',
  XNOR: '#7cc4f0',
};

const WIRE_PALETTE = [
  '#e6194b', '#3cb44b', '#f58231', '#4363d8', '#911eb4',
  '#46f0f0', '#f032e6', '#bcf60c', '#008080', '#e6beff',
  '#9a6324', '#800000', '#aaffc3', '#808000', '#ffd8b1',
  '#000075', '#808080'
];

export default function CircuitRenderer({ circuit, mode, onGateClick }) {
  const svgData = useMemo(() => {
    if (!circuit || !circuit.inputs || !circuit.gates) return null;

    const nodes = {};
    const edges = [];

    // Parse input nodes
    const inputNames = Object.keys(circuit.inputs).sort(
      (a, b) => parseInt(a.replace('In', '')) - parseInt(b.replace('In', ''))
    );

    inputNames.forEach(name => {
      nodes[name] = {
        id: name,
        type: 'input',
        label: circuit.inputs[name],
        depth: 0,
      };
    });

    // Parse gate nodes and establish depths
    let maxDepth = 0;
    circuit.gates.forEach(gate => {
      const outId = gate.id.replace('G', 'Out');
      const depths = gate.inputs.map(inp => nodes[inp]?.depth ?? 0);
      const depth = Math.max(...depths) + 1;
      maxDepth = Math.max(maxDepth, depth);

      nodes[outId] = {
        id: outId,
        gateId: gate.id,
        type: 'gate',
        gateType: gate.type,
        depth,
        gateInputs: gate.inputs,
      };

      gate.inputs.forEach((inp, idx) => {
        edges.push({ from: inp, to: outId, inputIdx: idx });
      });
    });

    // Parse final output node
    const lastGate = circuit.gates[circuit.gates.length - 1];
    const finalOutId = lastGate.id.replace('G', 'Out');
    const outDepth = maxDepth + 1;

    nodes['_output'] = {
      id: '_output',
      type: 'output',
      depth: outDepth,
    };
    edges.push({ from: finalOutId, to: '_output' });

    // Group nodes by depth column
    const columns = {};
    Object.values(nodes).forEach(node => {
      (columns[node.depth] ??= []).push(node);
    });

    // Positioning parameters matching standard mock layout
    const NW = 64, NH = 34;
    const COL_GAP = 120, ROW_GAP = 52;
    const PAD_X = 44, PAD_Y = 32;

    let maxRows = 0;
    Object.values(columns).forEach(col => {
      maxRows = Math.max(maxRows, col.length);
    });

    const svgW = PAD_X * 2 + outDepth * COL_GAP + NW;
    const svgH = PAD_Y * 2 + Math.max((maxRows - 1) * ROW_GAP + NH, NH + 40) + 60;

    for (let d = 0; d <= outDepth; d++) {
      const col = columns[d] || [];
      const totalH = (col.length - 1) * ROW_GAP;
      const startY = (svgH - 60 - totalH) / 2 - NH / 2;

      const gap_start = PAD_X + d * COL_GAP + NW;
      const step = 40 / (col.length + 1);

      for (let i = 0; i < col.length; i++) {
        col[i].x = PAD_X + d * COL_GAP;
        col[i].y = startY + i * ROW_GAP;
        col[i].trunkX = gap_start + 8 + (i + 1) * step;
        col[i].busY = svgH - 52 + d * 8 + i * 6;
      }
    }

    Object.values(nodes).forEach((node, idx) => {
      node.wireColor = WIRE_PALETTE[idx % WIRE_PALETTE.length];
    });

    return { nodes: Object.values(nodes), edges, svgW, svgH, NW, NH, finalOutId };
  }, [circuit]);

  if (!svgData) return null;

  const { nodes, edges, svgW, svgH, NW, NH, finalOutId } = svgData;

  return (
    <div className="circuit-svg-container" style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          fontFamily: 'var(--font-mono)',
          minWidth: `${svgW}px`,
          height: 'auto',
          backgroundColor: 'transparent'
        }}
      >
        {/* Render connection wires */}
        {edges.map((edge, idx) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const x1 = fromNode.x + NW;
          const y1 = fromNode.y + NH / 2;
          const x2 = toNode.x;
          let y2 = toNode.y + NH / 2;

          if (toNode.type === 'gate' && toNode.gateInputs && toNode.gateInputs.length > 1) {
            y2 += edge.inputIdx === 0 ? -7 : 7;
          }

          const tx = fromNode.trunkX;
          let path = `M${x1},${y1} L${tx},${y1} `;

          const pathElements = [];
          if (toNode.depth - fromNode.depth > 1) {
            const by = fromNode.busY;
            const destTx = x2 - 28 + (edge.inputIdx === 0 ? -10 : 10);
            path += `L${tx},${by} L${destTx},${by} L${destTx},${y2} L${x2},${y2}`;
            pathElements.push(
              <circle
                key={`bus-joint-${idx}`}
                cx={destTx}
                cy={by}
                r="3"
                fill={fromNode.wireColor || 'var(--primary-lime)'}
              />
            );
          } else {
            path += `L${tx},${y2} L${x2},${y2}`;
          }

          return (
            <g key={`edge-${idx}`}>
              <path
                d={path}
                fill="none"
                stroke={fromNode.wireColor || 'var(--text-muted)'}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle
                cx={tx}
                cy={y1}
                r="3"
                fill={fromNode.wireColor || 'var(--primary-lime)'}
              />
              {mode === 1 && fromNode.type === 'gate' && circuit.wire_values?.[fromNode.id] !== undefined && (
                <text
                  x={x1 + 6}
                  y={y1 - 6}
                  fontSize="12"
                  fontWeight="900"
                  fill={fromNode.wireColor || 'var(--text-primary)'}
                  textAnchor="start"
                >
                  {circuit.wire_values[fromNode.id]}
                </text>
              )}
              {pathElements}
            </g>
          );
        })}

        {/* Render nodes */}
        {nodes.map(node => {
          if (node.type === 'input') {
            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={NW}
                  height={NH}
                  rx="0"
                  fill="var(--surface-low)"
                  stroke="var(--surface-highest)"
                  strokeWidth="2.5"
                />
                <text
                  x={node.x + NW / 2}
                  y={node.y + NH / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="14"
                  fontWeight="900"
                  fill="var(--primary-lime)"
                >
                  {node.label}
                </text>
              </g>
            );
          }

          if (node.type === 'gate') {
            const gateColor = GATE_COLORS[node.gateType] || '#6c7bf0';
            const isClickable = mode === 1;

            return (
              <g
                key={node.id}
                onClick={() => isClickable && onGateClick?.(node.gateId)}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={NW}
                  height={NH}
                  rx="0"
                  fill={gateColor}
                  stroke="#000000"
                  strokeWidth="2"
                  className={isClickable ? 'hover-pulse' : ''}
                  style={{
                    filter: isClickable ? `drop-shadow(0 0 4px ${gateColor})` : 'none',
                  }}
                />
                <text
                  x={node.x + NW / 2}
                  y={node.y + NH / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="900"
                  fill="#ffffff"
                >
                  {node.gateType}
                </text>
              </g>
            );
          }

          if (node.type === 'output') {
            const cx = node.x + NW / 2;
            const cy = node.y + NH / 2;
            
            if (mode === 2) {
              return (
                <g key={node.id}>
                  {/* Dotted question mark circle field at the output */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="20"
                    fill="var(--surface-lowest)"
                    stroke="var(--secondary-magenta)"
                    strokeWidth="2.5"
                    strokeDasharray="4,3"
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="18"
                    fontWeight="900"
                    fill="var(--secondary-magenta)"
                  >
                    ?
                  </text>

                  {/* Vertically aligned 0 and 1 circles (0 up, 1 down) shifted horizontally */}
                  <g onClick={() => onGateClick?.('0')} className="svg-btn">
                    <circle cx={cx + 38} cy={cy - 38} r="18" fill="#000000" />
                    <g className="btn-face">
                      <circle
                        cx={cx + 38}
                        cy={cy - 38}
                        r="18"
                        fill="var(--surface-low)"
                        stroke="var(--primary-lime)"
                        strokeWidth="2.5"
                      />
                      <text
                        x={cx + 38}
                        y={cy - 38}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="16"
                        fontWeight="900"
                        fill="var(--primary-lime)"
                      >
                        0
                      </text>
                    </g>
                  </g>
                  <g onClick={() => onGateClick?.('1')} className="svg-btn">
                    <circle cx={cx + 38} cy={cy + 38} r="18" fill="#000000" />
                    <g className="btn-face">
                      <circle
                        cx={cx + 38}
                        cy={cy + 38}
                        r="18"
                        fill="var(--surface-low)"
                        stroke="var(--primary-lime)"
                        strokeWidth="2.5"
                      />
                      <text
                        x={cx + 38}
                        y={cy + 38}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="16"
                        fontWeight="900"
                        fill="var(--primary-lime)"
                      >
                        1
                      </text>
                    </g>
                  </g>
                </g>
              );
            }

            const finalOutValue = circuit.wire_values?.[finalOutId];
            const displayVal = (mode === 1 && finalOutValue !== undefined) ? finalOutValue : '?';
            const finalGateNode = nodes.find(n => n.id === finalOutId);
            const finalWireColor = (mode === 1 && finalGateNode)
              ? finalGateNode.wireColor
              : 'var(--secondary-magenta)';

            return (
              <g key={node.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="20"
                  fill="var(--surface-lowest)"
                  stroke={finalWireColor}
                  strokeWidth="2.5"
                  strokeDasharray={(mode === 1 && finalOutValue !== undefined) ? 'none' : '4,3'}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="18"
                  fontWeight="900"
                  fill={finalWireColor}
                >
                  {displayVal}
                </text>
              </g>
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
}
