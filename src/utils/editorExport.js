import { PDFDocument, rgb } from 'pdf-lib';

function parseColor(colorStr) {
  if (!colorStr) return undefined;
  if (colorStr === 'transparent') return undefined;
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  if (colorStr === 'red') return rgb(1, 0, 0);
  if (colorStr === 'black') return rgb(0, 0, 0);
  if (colorStr === 'white') return rgb(1, 1, 1);
  if (colorStr === 'blue') return rgb(0, 0, 1);
  if (colorStr === 'green') return rgb(0, 1, 0);
  return rgb(0, 0, 0); // fallback
}

export async function exportEditedPdf(originalPdfBytes, pagesFabricData) {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const fabricData = pagesFabricData[i];
    
    if (!fabricData || !fabricData.objects) continue;

    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    // We assume the fabric canvas was created with size exactly equal to the PDF page size, so scale = 1.
    let scale = 1;

    for (const obj of fabricData.objects) {
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      const fabricX = obj.left;
      const fabricY = obj.top;
      
      let objectWidth = (obj.width || 0) * scaleX;
      let objectHeight = (obj.height || 0) * scaleY;

      // Translate Fabric top-left coords to pdf-lib bottom-left coords
      const pdfX = fabricX * scale;
      const pdfY = pageHeight - (fabricY * scale) - (objectHeight * scale);

      if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
        const color = parseColor(obj.fill);
        const fontSize = (obj.fontSize || 16) * scaleX;
        
        page.drawText(obj.text || '', {
          x: pdfX,
          y: pdfY + (objectHeight * scale) * 0.2, // rough baseline adjustment
          size: fontSize,
          color: color || rgb(0, 0, 0),
        });
      } 
      else if (obj.type === 'rect') {
        const fill = parseColor(obj.fill);
        const stroke = parseColor(obj.stroke);
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: objectWidth * scale,
          height: objectHeight * scale,
          color: fill,
          borderColor: stroke,
          borderWidth: obj.strokeWidth ? obj.strokeWidth * scale : 0,
        });
      } 
      else if (obj.type === 'path') {
        // Advanced path mapping could be placed here, for now skip or do simple support
      } 
      else if (obj.type === 'image') {
        if (obj.src) {
          try {
            let img;
            if (obj.src.startsWith('data:image/png')) {
              img = await pdfDoc.embedPng(obj.src);
            } else if (obj.src.startsWith('data:image/jpeg') || obj.src.startsWith('data:image/jpg')) {
              img = await pdfDoc.embedJpg(obj.src);
            }
            
            if (img) {
              page.drawImage(img, {
                x: pdfX,
                y: pdfY,
                width: objectWidth * scale,
                height: objectHeight * scale,
              });
            }
          } catch (e) {
            console.error('Failed to embed image', e);
          }
        }
      }
    }
  }

  return await pdfDoc.save();
}
