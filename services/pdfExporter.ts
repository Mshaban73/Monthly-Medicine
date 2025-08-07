import { InvoiceItem, Patient } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extend the jsPDF type to include the autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
  lastAutoTable?: { finalY: number };
}

export const exportToPDF = (
    patient: Patient | null,
    items: InvoiceItem[],
    totals: { subtotal: number; discount: number; grandTotal: number }
) => {
    const doc = new (window as any).jspdf.jsPDF() as jsPDFWithAutoTable;
    
    // Set the font to Amiri, which was loaded in index.html and supports Arabic.
    doc.setFont('Amiri-Regular');

    const patientName = patient ? patient.name : 'كل الأصناف';
    const title = `فاتورة لـ: ${patientName}`;
    const date = new Date().toLocaleDateString('ar-EG-u-nu-latn'); // Using latin numbers for dates
    
    doc.setFontSize(18);
    doc.text(title, doc.internal.pageSize.getWidth() - 14, 15, { align: 'right' });
    
    doc.setFontSize(12);
    doc.text(`التاريخ: ${date}`, doc.internal.pageSize.getWidth() - 14, 22, { align: 'right' });

    const tableColumn = ["الصافي", "الخصم (%)", "الكمية", "السعر", "الصنف"];
    const tableRows: any[][] = [];

    items.forEach(item => {
        const netPrice = (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2);
        const itemData = [
            netPrice,
            item.discount,
            item.quantity,
            item.price.toFixed(2),
            item.name,
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
            font: 'Amiri-Regular',
            halign: 'center'
        },
        styles: {
            font: 'Amiri-Regular',
            halign: 'right', // Align all cell text to the right for RTL
        },
        columnStyles: {
            4: { cellWidth: 'auto'},
            0: { halign: 'center' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
        },
    });

    const finalY = doc.lastAutoTable?.finalY || 30;
    const summaryX = doc.internal.pageSize.getWidth() - 14;

    doc.setFontSize(12);
    doc.text(`الإجمالي قبل الخصم: ${totals.subtotal.toFixed(2)}`, summaryX, finalY + 10, { align: 'right' });
    doc.text(`مجموع الخصم: ${totals.discount.toFixed(2)}`, summaryX, finalY + 17, { align: 'right' });
    doc.setFontSize(14);
    doc.setFont('Amiri-Regular', 'bold');
    doc.text(`الإجمالي النهائي: ${totals.grandTotal.toFixed(2)}`, summaryX, finalY + 25, { align: 'right' });

    doc.save(`فاتورة-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().slice(0,10)}.pdf`);
};
