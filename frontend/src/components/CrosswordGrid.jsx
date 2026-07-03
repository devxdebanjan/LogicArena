import React, { useRef, useEffect, useState, useMemo } from 'react';

const CONNECTION_COLORS = [
  '#6c7bf0', '#4ecab4', '#f0884c', '#f06c7a', '#b07cf0', '#7cc4f0', '#f0b84c'
];

export default function CrosswordGrid({ puzzleData, userAnswers, setUserAnswers, showAlert }) {
  const gridRef = useRef(null);
  const [coords, setCoords] = useState([]);

  const remainingInventory = useMemo(() => {
    if (!puzzleData || !puzzleData.inventory) return [];
    return puzzleData.inventory.map(item => {
      const placedCount = Object.values(userAnswers).filter(val => val === item.value).length;
      const remaining = Math.max(0, item.quantity - placedCount);
      return { ...item, remaining };
    });
  }, [puzzleData, userAnswers]);

  const drawConnections = () => {
    if (!puzzleData || !puzzleData.connections || !gridRef.current) return;
    const parentRect = gridRef.current.getBoundingClientRect();
    
    const computed = puzzleData.connections.map((conn, index) => {
      const fromEl = document.getElementById(`cell-${conn.from}`);
      const toEl = document.getElementById(`cell-${conn.to}`);
      if (!fromEl || !toEl) return null;

      const fRect = fromEl.getBoundingClientRect();
      const tRect = toEl.getBoundingClientRect();

      const fx = fRect.left + fRect.width / 2 - parentRect.left;
      const fy = fRect.top + fRect.height / 2 - parentRect.top;
      const tx = tRect.left + tRect.width / 2 - parentRect.left;
      const ty = tRect.top + tRect.height / 2 - parentRect.top;

      const dx = tx - fx;
      const dy = ty - fy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let x1 = fx;
      let y1 = fy;
      let x2 = tx;
      let y2 = ty;

      if (dist > 0) {
        x1 = fx;
        y1 = fy;

        const halfW = 40;
        const halfH = 40;
        let xBorder = 0;
        let yBorder = 0;

        if (Math.abs(dx) >= Math.abs(dy)) {
          xBorder = Math.sign(dx) * halfW;
          yBorder = dy * halfW / Math.abs(dx);
        } else {
          xBorder = dx * halfH / Math.abs(dy);
          yBorder = Math.sign(dy) * halfH;
        }

        // Backs off the destination point by 8px along the connection vector
        // to give the arrowhead marker breathing room and prevent overlap
        const backoff = 8;
        x2 = tx - xBorder - (dx / dist) * backoff;
        y2 = ty - yBorder - (dy / dist) * backoff;
      }

      const color = CONNECTION_COLORS[index % CONNECTION_COLORS.length];
      const cleanColor = color.replace('#', '');

      return {
        id: `conn-${conn.from}-${conn.to}`,
        x1, y1, x2, y2, color, cleanColor
      };
    }).filter(Boolean);

    setCoords(computed);
  };

  useEffect(() => {
    const t = setTimeout(drawConnections, 60);
    window.addEventListener('resize', drawConnections);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', drawConnections);
    };
  }, [puzzleData, userAnswers]);

  const handleDragStart = (e, value, type, sourceCellId = null) => {
    e.dataTransfer.setData('text/plain', value);
    e.dataTransfer.setData('itemType', type);
    if (sourceCellId) {
      e.dataTransfer.setData('sourceCellId', sourceCellId);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, cellId, expectedType) => {
    e.preventDefault();
    const value = e.dataTransfer.getData('text/plain');
    const type = e.dataTransfer.getData('itemType');

    if (!type || !expectedType || type.toLowerCase() !== expectedType.toLowerCase()) {
      if (showAlert) {
        showAlert(`Cannot drop a ${type} item into a ${expectedType} slot.`, 'INCOMPATIBLE ELEMENT');
      } else {
        alert(`Cannot drop a ${type} item into a ${expectedType} slot.`);
      }
      return;
    }

    const inventoryItem = remainingInventory.find(
      i => i.value === value && i.type && i.type.toLowerCase() === type.toLowerCase()
    );
    if (!inventoryItem || inventoryItem.remaining <= 0) {
      if (showAlert) {
        showAlert(`No more pieces of ${value} available.`, 'INVENTORY EXHAUSTED');
      } else {
        alert(`No more pieces of ${value} available.`);
      }
      return;
    }

    setUserAnswers(prev => ({
      ...prev,
      [cellId]: value
    }));
  };

  const handleDoubleClick = (cellId) => {
    setUserAnswers(prev => {
      const updated = { ...prev };
      delete updated[cellId];
      return updated;
    });
  };

  if (!puzzleData || !puzzleData.grid) return null;

  const { grid, cells } = puzzleData;

  const cellMap = {};
  cells.forEach(c => {
    cellMap[`${c.x},${c.y}`] = c;
  });

  const gridCells = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      gridCells.push(cellMap[`${x},${y}`] || { empty: true, x, y });
    }
  }

  return (
    <div className="crossword-container">
      <div className="crossword-grid-wrapper neo-border" ref={gridRef}>
        <div
          className="crossword-grid"
          style={{
            gridTemplateColumns: `repeat(${grid.width}, 80px)`,
            gridTemplateRows: `repeat(${grid.height}, 80px)`,
          }}
        >
          {gridCells.map((cell, idx) => {
            if (cell.empty) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="crossword-cell empty"
                />
              );
            }

            const cellType = cell.type ? cell.type.toLowerCase() : '';
            const answerVal = userAnswers[cell.id];

            if (cell.is_static) {
              return (
                <div
                  key={cell.id}
                  id={`cell-${cell.id}`}
                  className={`crossword-cell static-${cellType}`}
                  style={{
                    border: `2px solid ${cellType === 'gate' ? 'var(--secondary-magenta)' : 'var(--primary-lime)'}`,
                    backgroundColor: 'var(--surface-high)'
                  }}
                >
                  {cell.value}
                </div>
              );
            }

             return (
              <div
                key={cell.id}
                id={`cell-${cell.id}`}
                className={`crossword-cell drop-target drop-target-${cellType} ${
                  answerVal ? (cellType === 'gate' ? 'dropped-gate' : 'dropped-value') : ''
                }`}
                draggable={!!answerVal}
                onDragStart={(e) => {
                  if (answerVal) {
                    handleDragStart(e, answerVal, cellType, cell.id);
                  }
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, cell.id, cellType)}
                onDoubleClick={() => handleDoubleClick(cell.id)}
                title="Double click or drag back to inventory to remove placed piece"
              >
                {answerVal || ''}
              </div>
            );
          })}
        </div>

        <svg className="svg-overlay">
          <defs>
            {CONNECTION_COLORS.map(color => {
              const cleanColor = color.replace('#', '');
              return (
                <marker
                  key={`arrow-${cleanColor}`}
                  id={`arrowhead-${cleanColor}`}
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill={color} />
                </marker>
              );
            })}
          </defs>
          
          {coords.map(line => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeWidth="2.5"
              markerEnd={`url(#arrowhead-${line.cleanColor})`}
            />
          ))}
        </svg>
      </div>

      <div 
        className="crossword-inventory neo-border"
        onDragOver={handleDragOver}
        onDrop={(e) => {
          e.preventDefault();
          const sourceCellId = e.dataTransfer.getData('sourceCellId');
          if (sourceCellId) {
            handleDoubleClick(sourceCellId);
          }
        }}
      >
        <div className="inventory-title">[ AVAILABLE SYSTEM PIECES ]</div>
        <div className="inventory-list">
          {remainingInventory.map((item, idx) => {
            if (item.remaining <= 0) return null;
            
            const isGate = item.type && item.type.toLowerCase() === 'gate';
            
            return (
              <div
                key={`inv-${idx}`}
                className={isGate ? 'draggable-gate' : 'draggable-value'}
                draggable
                onDragStart={(e) => handleDragStart(e, item.value, item.type)}
              >
                {item.value} ({item.remaining})
              </div>
            );
          })}
          {remainingInventory.every(i => i.remaining <= 0) && (
            <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
              All pieces placed. Double click or drag and drop back to inventory to recall them.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
