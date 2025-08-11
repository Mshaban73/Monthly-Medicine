import { InvoiceItem, Patient } from '../types';

// By not importing jspdf, we force the use of the global window.jspdf object,
// which is where the Amiri font and autotable plugin from index.html are attached.

// Manually declare the necessary types for the jsPDF instance from the window object.
// This avoids TypeScript errors without importing conflicting ES modules.
interface jsPDFWithAutoTable {
  autoTable: (options: any) => jsPDFWithAutoTable;
  lastAutoTable?: { finalY: number };
  setFont: (fontName: string, fontStyle?: string) => jsPDFWithAutoTable;
  setFontSize: (size: number) => jsPDFWithAutoTable;
  text: (text: string | string[], x: number, y: number, options?: any) => jsPDFWithAutoTable;
  internal: {
    pageSize: {
      getWidth: () => number;
    };
  };
  save: (filename: string) => void;
}

export const exportToPDF = (
    patient: Patient | null,
    items: InvoiceItem[],
    totals: { subtotal: number; discount: number; grandTotal: number }
) => {
    // Use the jsPDF constructor from the window object. This ensures we get the
    // instance that has been patched by the font file and the autotable plugin.
    const jsPDFConstructor = (window as any).jspdf.jsPDF;
    const doc = new jsPDFConstructor() as jsPDFWithAutoTable;
    
    // Set the font to Amiri. This is the critical step to render Arabic correctly.
    doc.setFont('Amiri-Regular');

    const patientName = patient ? patient.name : 'كل الأصناف';
    const title = `فاتورة لـ: ${patientName}`;
    const date = `التاريخ: ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}`;
    
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Draw text from right to left using the `align: 'right'` option.
    doc.setFontSize(18);
    doc.text(title, pageWidth - 14, 15, { align: 'right' });
    
    doc.setFontSize(12);
    doc.text(date, pageWidth - 14, 22, { align: 'right' });

    // For proper RTL tables, we must define columns in their visual order (right to left).
    const tableColumn = ["الصنف", "السعر", "الكمية", "الخصم (%)", "الصافي"];
    const tableRows: (string | number)[][] = [];

    items.forEach(item => {
        const netPrice = (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2);
        // Create the row data in the same visual order as the headers.
        const itemData = [
            item.name,
            item.price.toFixed(2),
            item.quantity,
            item.discount,
            netPrice,
        ];
        tableRows.push(itemData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            font: 'Amiri-Regular', // Specify the font for the header
            halign: 'center',
        },
        styles: {
            font: 'Amiri-Regular', // Specify the font for all cells
            halign: 'center', // Center-align numeric columns
        },
        columnStyles: {
            // Right-align the first column (الصنف) for a clean RTL look.
            0: { halign: 'right', cellWidth: 'auto' }, 
        },
    });

    const finalY = doc.lastAutoTable?.finalY || 30;
    const summaryX = pageWidth - 14;
    const summaryStartY = finalY + 10;

    doc.setFontSize(12);
    doc.text(`الإجمالي قبل الخصم: ${totals.subtotal.toFixed(2)}`, summaryX, summaryStartY, { align: 'right' });
    doc.text(`مجموع الخصم: ${totals.discount.toFixed(2)}`, summaryX, summaryStartY + 7, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setFont('Amiri-Regular', 'bold');
    doc.text(`الإجمالي النهائي: ${totals.grandTotal.toFixed(2)}`, summaryX, summaryStartY + 15, { align: 'right' });

    doc.save(`فاتورة-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().slice(0,10)}.pdf`);
};