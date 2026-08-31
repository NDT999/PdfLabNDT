import { Document, Paragraph, TextRun, Table as DocxTable, TableRow, TableCell, Packer, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function exportToDocx(text, tables = [], filename = 'ocr-result') {
  const children = [];

  if (text) {
    const paragraphs = text.split('\n\n');
    for (const pText of paragraphs) {
      const lines = pText.split('\n');
      const textRuns = [];
      lines.forEach((line, index) => {
        textRuns.push(new TextRun({ text: line, break: index > 0 ? 1 : 0 }));
      });
      children.push(new Paragraph({ children: textRuns }));
    }
  }

  tables.forEach((tableGrid, tableIndex) => {
    children.push(new Paragraph({ text: `Table ${tableIndex + 1}`, spacing: { before: 400, after: 200 } }));
    
    const docxRows = tableGrid.map(row => {
      const docxCells = row.map(cellText => {
        return new TableCell({
          children: [new Paragraph({ text: cellText || '' })],
        });
      });
      return new TableRow({ children: docxCells });
    });

    if (docxRows.length > 0) {
      children.push(
        new DocxTable({
          rows: docxRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        })
      );
    }
  });

  const doc = new Document({
    sections: [{ children }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

export async function exportToXlsx(tables, filename = 'ocr-tables') {
  const workbook = new ExcelJS.Workbook();
  
  tables.forEach((tableGrid, index) => {
    const sheet = workbook.addWorksheet(`Table ${index + 1}`);
    
    tableGrid.forEach((row, rowIndex) => {
      const sheetRow = sheet.addRow(row);
      if (rowIndex === 0) {
        sheetRow.font = { bold: true };
        sheetRow.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };
        });
      }
    });

    sheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

export async function createSearchablePdf(pages) {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const pageData of pages) {
    const { imageBytes, width, height, words } = pageData;
    
    const page = pdfDoc.addPage([width, height]);
    
    const image = await pdfDoc.embedPng(imageBytes);
    
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height
    });

    words.forEach(word => {
      const { text, x0, y0, x1, y1 } = word;
      const wordHeight = y1 - y0;
      
      const fontSize = wordHeight;
      const pdfY = height - y1;
      
      page.drawText(text, {
        x: x0,
        y: pdfY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
        opacity: 0.01
      });
    });
  }

  return await pdfDoc.save();
}

export function downloadBytes(data, filename, mimeType = 'application/pdf') {
  const blob = new Blob([data], { type: mimeType });
  saveAs(blob, filename);
}
