import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceItem, Patient } from '../types';
import { AMIRI_FONT_BASE64 } from './AmiriFont';

// Extend the jsPDF interface to include the autoTable plugin's properties for type safety
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable?: {
        finalY?: number;
    };
}

export const exportToPDF = (
    patient: Patient | null,
    items: InvoiceItem[],
    totals: { subtotal: number; discount: number; grandTotal: number }
) => {
    // Initialize with the extended interface for better type checking
    const doc: jsPDFWithAutoTable = new jsPDF();
    
    // 1. Add the font file to the virtual file system.
    doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_FONT_BASE64);
    // 2. Add the font to jsPDF.
    doc.addFont('Amiri-Regular.ttf', 'Amiri-Regular', 'normal');
    // 3. Set the font for the entire document.
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

    // For proper RTL tables, define columns in their visual order (right to left).
    const tableColumn = ["الصافي", "الخصم (%)", "الكمية", "السعر", "الصنف"];
    const tableRows: (string | number)[][] = [];

    items.forEach(item => {
        const netPrice = (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2);
        // Create row data in the same visual order as headers (right-to-left).
        const itemData = [
            netPrice,
            item.discount,
            item.quantity,
            item.price.toFixed(2),
            item.name,
        ];
        tableRows.push(itemData);
    });

    autoTable(doc, {
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
            halign: 'center',
        },
        columnStyles: {
            // Right-align the last column (الصنف) for a clean RTL look.
            4: { halign: 'right' }, 
        },
    });

    // Use the type-safe property from our extended interface
    const finalY = doc.lastAutoTable?.finalY || 30;
    const summaryX = pageWidth - 14;
    const summaryStartY = finalY + 10;

    doc.setFontSize(12);
    doc.text(`الإجمالي قبل الخصم: ${totals.subtotal.toFixed(2)}`, summaryX, summaryStartY, { align: 'right' });
    doc.text(`مجموع الخصم: ${totals.discount.toFixed(2)}`, summaryX, summaryStartY + 7, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setFont('Amiri-Regular', 'normal'); // Set font to normal weight for the final total
    doc.text(`الإجمالي النهائي: ${totals.grandTotal.toFixed(2)}`, summaryX, summaryStartY + 15, { align: 'right' });

    doc.save(`فاتورة-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().slice(0,10)}.pdf`);
};
