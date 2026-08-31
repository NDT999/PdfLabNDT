export function detectTables(words, options = {}) {
  const { rowTolerance = 10, colTolerance = 20, minRows = 2, minCols = 2 } = options;
  if (!words || words.length === 0) return [];

  const processedWords = words.map(w => {
    const x0 = w.x0 ?? w.bbox?.x0 ?? 0;
    const y0 = w.y0 ?? w.bbox?.y0 ?? 0;
    const x1 = w.x1 ?? w.bbox?.x1 ?? 0;
    const y1 = w.y1 ?? w.bbox?.y1 ?? 0;
    return {
      ...w,
      bounds: { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 },
      yCenter: (y0 + y1) / 2
    };
  });

  processedWords.sort((a, b) => a.yCenter - b.yCenter);

  const rawRows = [];
  let currentRow = [];
  let currentYCenter = processedWords[0].yCenter;

  processedWords.forEach(w => {
    if (Math.abs(w.yCenter - currentYCenter) <= rowTolerance) {
      currentRow.push(w);
      currentYCenter = ((currentYCenter * (currentRow.length - 1)) + w.yCenter) / currentRow.length;
    } else {
      if (currentRow.length > 0) rawRows.push(currentRow);
      currentRow = [w];
      currentYCenter = w.yCenter;
    }
  });
  if (currentRow.length > 0) rawRows.push(currentRow);

  rawRows.forEach(row => row.sort((a, b) => a.bounds.x0 - b.bounds.x0));

  const tables = [];
  let currentTableRows = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.length >= minCols) {
      currentTableRows.push(row);
    } else {
      if (currentTableRows.length >= minRows) {
        tables.push(buildTable(currentTableRows, colTolerance));
      }
      currentTableRows = [];
    }
  }
  if (currentTableRows.length >= minRows) {
    tables.push(buildTable(currentTableRows, colTolerance));
  }

  return tables;
}

function buildTable(rows, colTolerance) {
  let xBoundaries = [];
  rows.forEach(row => {
    row.forEach(word => {
      let found = false;
      for (let i = 0; i < xBoundaries.length; i++) {
        if (Math.abs(xBoundaries[i] - word.bounds.x0) <= colTolerance) {
          found = true;
          break;
        }
      }
      if (!found) {
        xBoundaries.push(word.bounds.x0);
      }
    });
  });
  xBoundaries.sort((a, b) => a - b);
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const processedRows = rows.map(row => {
    let rowMinY = Infinity, rowMaxY = -Infinity;
    const cells = row.map(word => {
      minX = Math.min(minX, word.bounds.x0);
      minY = Math.min(minY, word.bounds.y0);
      maxX = Math.max(maxX, word.bounds.x1);
      maxY = Math.max(maxY, word.bounds.y1);
      rowMinY = Math.min(rowMinY, word.bounds.y0);
      rowMaxY = Math.max(rowMaxY, word.bounds.y1);
      return {
        text: word.text,
        confidence: word.confidence,
        bounds: {
          x: word.bounds.x0,
          y: word.bounds.y0,
          width: word.bounds.width,
          height: word.bounds.height
        }
      };
    });
    return {
      cells,
      y: rowMinY,
      height: rowMaxY - rowMinY
    };
  });

  return {
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    },
    rows: processedRows,
    colBoundaries: xBoundaries,
    rowBoundaries: processedRows.map(r => r.y)
  };
}

export function drawTableOverlay(sourceCanvas, tables, lineColor = '#3b82f6', lineWidth = 2) {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = sourceCanvas.width;
  newCanvas.height = sourceCanvas.height;
  const ctx = newCanvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;

  tables.forEach(table => {
    ctx.strokeRect(table.bounds.x, table.bounds.y, table.bounds.width, table.bounds.height);
    
    table.colBoundaries.forEach(x => {
      ctx.beginPath();
      ctx.moveTo(x, table.bounds.y);
      ctx.lineTo(x, table.bounds.y + table.bounds.height);
      ctx.stroke();
    });

    table.rowBoundaries.forEach(y => {
      ctx.beginPath();
      ctx.moveTo(table.bounds.x, y);
      ctx.lineTo(table.bounds.x + table.bounds.width, y);
      ctx.stroke();
    });
  });

  return newCanvas;
}

export function drawWordOverlay(sourceCanvas, words) {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = sourceCanvas.width;
  newCanvas.height = sourceCanvas.height;
  const ctx = newCanvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  ctx.lineWidth = 2;

  words.forEach(w => {
    const x0 = w.x0 ?? w.bbox?.x0 ?? 0;
    const y0 = w.y0 ?? w.bbox?.y0 ?? 0;
    const x1 = w.x1 ?? w.bbox?.x1 ?? 0;
    const y1 = w.y1 ?? w.bbox?.y1 ?? 0;
    
    const confidence = w.confidence || 0;
    if (confidence > 90) {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // Green
    } else if (confidence >= 70) {
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)'; // Yellow
    } else {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red
    }

    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  });

  return newCanvas;
}

export function tablesToGrid(tables) {
  return tables.map(table => {
    return table.rows.map(row => {
      return row.cells.map(cell => cell.text);
    });
  });
}
