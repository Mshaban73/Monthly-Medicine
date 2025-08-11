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
    // This is a performance-optimized way to do the conversion for large files.
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
    // Fetch the font from a reliable CDN
    const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf';
    const response = await fetch(fontUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch font: ${response.statusText}`);
    }
    const fontBuffer = await response.arrayBuffer();
    
    // --- KEY FIX ---
    // Convert the ArrayBuffer to a binary string, which is what addFileToVFS expects.
    const binaryFont = arrayBufferToBinaryString(fontBuffer);
    amiriFontBinary = binaryFont; // Cache the result
    return binaryFont;
}


export const exportToPDF = async (
    patient: Patient | null,
    items: InvoiceItem[],
    totals: { subtotal: number; discount: number; grandTotal: number }
) => {
    try {
        const doc: jsPDFWithAutoTable = new jsPDF();
        
        // Fetch the font file as a binary string.
        const fontBinary = await getAmiriFont();

        // 1. Add the raw font file (as a binary string) to the virtual file system.
        doc.addFileToVFS('Amiri.ttf', fontBinary);
        // 2. Add the font to jsPDF.
        doc.addFont('Amiri.ttf', 'Amiri', 'normal');
        // 3. Set the font for the entire document.
        doc.setFont('Amiri');

        const patientName = patient ? patient.name : 'كل الأصناف';
        const title = `فاتورة لـ: ${patientName}`;
        const date = `التاريخ: ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}`;
        
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(18);
        doc.text(title, pageWidth - 14, 15, { align: 'right' });
        
        doc.setFontSize(12);
        doc.text(date, pageWidth - 14, 22, { align: 'right' });

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