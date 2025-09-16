import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceItem, Patient } from '../types';

// Extend the jsPDF interface to include the autoTable plugin's properties for type safety
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable?: {
        finalY?: number;
    };
}

// A global variable to cache the fetched font to avoid re-downloading on subsequent clicks.
let amiriFontBinary: string | null = null;

// Function to convert ArrayBuffer to a binary string that jsPDF can understand.
function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
    const uint8 = new Uint8Array(buffer);
    let binaryString = '';
    const CHUNK_SIZE = 0x8000;
    for (let i = 0; i < uint8.length; i += CHUNK_SIZE) {
        binaryString += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + CHUNK_SIZE)));
    }
    return binaryString;
}


async function getAmiriFont(): Promise<string> {
    if (amiriFontBinary) {
        return amiriFontBinary;
    }
    const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf';
    const response = await fetch(fontUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch font: ${response.statusText}`);
    }
    const fontBuffer = await response.arrayBuffer();
    
    const binaryFont = arrayBufferToBinaryString(fontBuffer);
    amiriFontBinary = binaryFont;
    return binaryFont;
}


export const exportToPDF = async (
    patient: Patient | null,
    items: InvoiceItem[],
    totals: { subtotal: number; discount: number; grandTotal: number }
) => {
    try {
        const doc: jsPDFWithAutoTable = new jsPDF();
        
        const fontBinary = await getAmiriFont();

        doc.addFileToVFS('Amiri.ttf', fontBinary);
        doc.addFont('Amiri.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri');

        const patientName = patient ? patient.name : 'كل الأصناف';
        const title = `فاتورة لـ: ${patientName}`;
        
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(18);
        doc.text(title, pageWidth - 14, 15, { align: 'right' });
        
        // ======================= START: THE ONLY FIX NEEDED =======================
        // The original problem was mixing RTL text ("التاريخ") with LTR numbers in one string.
        // The fix is to print them separately, controlling their position manually.
        
        const dateLabel = "التاريخ:";
        const dateString = new Date().toLocaleDateString('ar-EG-u-nu-latn'); // e.g., "١٦‏/٩‏/٢٠٢٥" or "16/9/2025"
        
        doc.setFontSize(12);
        
        // 1. Print the Arabic label aligned to the far right.
        doc.text(dateLabel, pageWidth - 14, 22, { align: 'right' });
        
        // 2. Measure the width of the label to position the date number next to it.
        const labelWidth = doc.getTextWidth(dateLabel);
        
        // 3. Print the date string to the left of the label.
        doc.text(dateString, pageWidth - 14 - labelWidth - 2, 22); // Subtract label width and a small space
        // ======================== END: THE ONLY FIX NEEDED ========================

        const tableColumn = ["الصافي", "الخصم (%)", "الكمية", "السعر", "الصنف"];
        const tableRows: (string | number)[][] = [];

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

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                font: 'Amiri',
                halign: 'center',
            },
            styles: {
                font: 'Amiri',
                halign: 'center',
            },
            columnStyles: {
                4: { halign: 'right' }, 
            },
        });

        const finalY = doc.lastAutoTable?.finalY || 30;
        const summaryX = pageWidth - 14;
        const summaryStartY = finalY + 10;

        doc.setFontSize(12);
        doc.text(`الإجمالي قبل الخصم: ${totals.subtotal.toFixed(2)}`, summaryX, summaryStartY, { align: 'right' });
        doc.text(`مجموع الخصم: ${totals.discount.toFixed(2)}`, summaryX, summaryStartY + 7, { align: 'right' });
        
        doc.setFontSize(14);
        doc.text(`الإجمالي النهائي: ${totals.grandTotal.toFixed(2)}`, summaryX, summaryStartY + 15, { align: 'right' });

        doc.save(`فاتورة-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("حدث خطأ أثناء إنشاء ملف PDF. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
    }
};
