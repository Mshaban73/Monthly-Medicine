// import { jsPDF } from 'jspdf'; // Use this if you have the types installed
import jsPDF from 'jspdf'; // Keep your original import
import autoTable from 'jspdf-autotable';
import { InvoiceItem, Patient } from '../types';

// Extend the jsPDF interface to include the autoTable plugin's properties for type safety
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable?: {
        finalY?: number;
    };
}

// ===================================================================
// --- START: Arabic Processing Function ---
// This function reshapes and reorders Arabic text to be correctly rendered in jsPDF.
// ===================================================================
function processArabic(text: string): string {
    if (!text) {
        return "";
    }

    const glyphs = {
        'ا': [0xFE8D, 0xFE8E], 'أ': [0xFE83, 0xFE84], 'إ': [0xFE87, 0xFE88],
        'آ': [0xFE81, 0xFE82], 'ب': [0xFE91, 0xFE92, 0xFE90, 0xFE8F],
        'ة': [0xFECB, 0xFECC], 'ت': [0xFE97, 0xFE98, 0xFE96, 0xFE95],
        'ث': [0xFE9B, 0xFE9C, 0xFE9A, 0xFE99], 'ج': [0xFEA0, 0xFEA0, 0xFE9E, 0xFE9D],
        'ح': [0xFEA6, 0xFEA6, 0xFEA4, 0xFEA3], 'خ': [0xFEAA, 0xFEAA, 0xFEA8, 0xFEA7],
        'د': [0xFEAB, 0xFEAC], 'ذ': [0xFEAD, 0xFEAE], 'ر': [0xFEAF, 0xFEB0],
        'ز': [0xFEB1, 0xFEB2], 'س': [0xFEB7, 0xFEB8, 0xFEB6, 0xFEB5],
        'ش': [0xFEBB, 0xFEBC, 0xFEBA, 0xFEB9], 'ص': [0xFEBF, 0xFEC0, 0xFEBE, 0xFEBD],
        'ض': [0xFEC3, 0xFEC4, 0xFEC2, 0xFEC1], 'ط': [0xFEC7, 0xFEC8, 0xFEC6, 0xFEC5],
        'ظ': [0xFECB, 0xFECC, 0xFECA, 0xFEC9], 'ع': [0xFECF, 0xFED0, 0xFECE, 0xFECD],
        'غ': [0xFED3, 0xFED4, 0xFED2, 0xFED1], 'ف': [0xFED7, 0xFED8, 0xFED6, 0xFED5],
        'ق': [0xFEDB, 0xFEDC, 0xFEDA, 0xFED9], 'ك': [0xFEE0, 0xFEE0, 0xFEDE, 0xFEDD],
        'ل': [0xFEE7, 0xFEE8, 0xFEE6, 0xFEE5], 'م': [0xFEEB, 0xFEEC, 0xFEEA, 0xFEE9],
        'ن': [0xFEF0, 0xFEF0, 0xFEEE, 0xFEED], 'ه': [0xFEF4, 0xFEF4, 0xFEF2, 0xFEF1],
        'و': [0xFEF5, 0xFEF6], 'ى': [0xFEF8, 0xFEF8, 0xFEF8, 0xFEF7],
        'ي': [0xFEFC, 0xFEFC, 0xFEFA, 0xFEF9], 'ﻻ': [0xFEFC, 0xFEFB],
        'ﻷ': [0xFEF8, 0xFEF7], 'ﻹ': [0xFEFA, 0xFEF9], 'ﻵ': [0xFEF6, 0xFEF5]
    };

    let result = '';
    const words = text.split(/\s+/);
    
    words.forEach((word, i) => {
        // Only process words containing Arabic characters
        if (/[ء-ي]/.test(word)) {
            let reshapedWord = '';
            for (let j = 0; j < word.length; j++) {
                const char = word[j];
                const prevChar = word[j - 1];
                const nextChar = word[j + 1];

                let shape = 0; // 0: Isolated, 1: Final, 2: Medial, 3: Initial

                const canConnectPrev = prevChar && glyphs[prevChar] && glyphs[prevChar].length > 2;
                const canConnectNext = nextChar && glyphs[nextChar] && glyphs[nextChar].length > 2;

                if (canConnectPrev && canConnectNext) shape = 2; // Medial
                else if (canConnectNext) shape = 3; // Initial
                else if (canConnectPrev) shape = 1; // Final

                const glyph = glyphs[char];
                if (glyph) {
                    reshapedWord += String.fromCharCode(glyph[shape] || glyph[0]);
                } else {
                    reshapedWord += char;
                }
            }
            // Reverse the reshaped word for RTL rendering
            result += reshapedWord.split('').reverse().join('');
        } else {
            // Keep non-Arabic words as they are
            result += word;
        }

        if (i < words.length - 1) {
            result += ' ';
        }
    });

    return result.split(' ').reverse().join(' ');
}
// --- END: Arabic Processing Function ---


// A global variable to cache the fetched font.
let amiriFontBinary: string | null = null;

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

        // --- MODIFIED: Process all Arabic strings before rendering ---
        const patientName = patient ? patient.name : 'كل الأصناف';
        const title = processArabic(`فاتورة لـ: ${patientName}`);
        
        // Using 'ar-EG-u-nu-latn' is smart as it keeps numbers in Latin format.
        const dateStr = new Date().toLocaleDateString('ar-EG-u-nu-latn');
        const date = processArabic(`التاريخ: ${dateStr}`);
        
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(18);
        doc.text(title, pageWidth - 14, 15, { align: 'right' });
        
        doc.setFontSize(12);
        doc.text(date, pageWidth - 14, 22, { align: 'right' });

        // --- MODIFIED: Process table headers ---
        const tableColumn = ["الصافي", "الخصم (%)", "الكمية", "السعر", "الصنف"].map(processArabic);
        const tableRows: (string | number)[][] = [];

        items.forEach(item => {
            const netPrice = (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2);
            const itemData = [
                netPrice,
                item.discount,
                item.quantity,
                item.price.toFixed(2),
                processArabic(item.name), // --- MODIFIED: Process item name ---
            ];
            tableRows.push(itemData);
        });

        // The autoTable columns are visually from left to right, but our headers are RTL.
        // We must reverse the header array to match the visual order.
        autoTable(doc, {
            head: [tableColumn.reverse()], // --- MODIFIED: Reverse the header array ---
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
                // Column indices are now reversed visually. 'الصنف' is at index 0.
                0: { halign: 'right' }, // الصنف
                4: { halign: 'center' }, // الصافي
            },
        });

        const finalY = doc.lastAutoTable?.finalY || 30;
        const summaryX = pageWidth - 14;
        const summaryStartY = finalY + 10;

        doc.setFontSize(12);
        // --- MODIFIED: Process summary text ---
        doc.text(processArabic(`الإجمالي قبل الخصم: ${totals.subtotal.toFixed(2)}`), summaryX, summaryStartY, { align: 'right' });
        doc.text(processArabic(`مجموع الخصم: ${totals.discount.toFixed(2)}`), summaryX, summaryStartY + 7, { align: 'right' });
        
        doc.setFontSize(14);
        doc.text(processArabic(`الإجمالي النهائي: ${totals.grandTotal.toFixed(2)}`), summaryX, summaryStartY + 15, { align: 'right' });

        // The filename itself should NOT be processed. Browsers and OS handle Unicode filenames correctly.
        doc.save(`فاتورة-${patientName.replace(/\s/g, '_')}-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("حدث خطأ أثناء إنشاء ملف PDF. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
    }
};
