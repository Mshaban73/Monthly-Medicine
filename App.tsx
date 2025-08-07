import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Patient, Product, InvoiceItem, PatientMedication } from './types';
import { TrashIcon, SaveIcon, ExportIcon, PlusIcon, StarIcon } from './components/icons';
import { exportToPDF } from './services/pdfExporter';
import { CollapsibleSection } from './components/CollapsibleSection';
import { DataManager } from './components/DataManager';

// --- Local Storage Keys ---
const LOCAL_STORAGE_KEYS = {
    PATIENTS: 'pharmacy_patients_v1',
    PRODUCTS: 'pharmacy_products_v1',
    PATIENT_MEDICATIONS: 'pharmacy_patient_meds_v1',
};

// --- Helper function to load from localStorage ---
const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        console.error(`Failed to parse ${key} from localStorage`, error);
        return fallback;
    }
};

// --- Reusable Components (Defined outside App to prevent re-creation on re-renders) ---

interface InvoiceRowProps {
    item: InvoiceItem;
    onUpdate: (item: InvoiceItem) => void;
    onRemove: (productId: string) => void;
    onToggleDefault: (productId: string) => void;
    isMarkedAsDefault: boolean;
}

const InvoiceRow: React.FC<InvoiceRowProps> = ({ item, onUpdate, onRemove, onToggleDefault, isMarkedAsDefault }) => {
    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const quantity = parseInt(e.target.value, 10) || 0;
        onUpdate({ ...item, quantity });
    };

    const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const discount = parseFloat(e.target.value) || 0;
        onUpdate({ ...item, discount: Math.max(0, Math.min(100, discount)) });
    };

    const netPrice = (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2);

    return (
        <tr className="border-b border-gray-200 hover:bg-gray-50 text-gray-700 font-sans">
            <td className="p-3">{item.name}</td>
            <td className="p-3 text-center">{item.price.toFixed(2)}</td>
            <td className="p-3">
                <input type="number" value={item.quantity} onChange={handleQuantityChange} className="w-20 text-center bg-gray-50 border border-gray-300 rounded-md p-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" min="0" />
            </td>
            <td className="p-3">
                 <div className="relative mx-auto w-24">
                    <input type="number" value={item.discount} onChange={handleDiscountChange} className="w-full text-center bg-gray-50 border border-gray-300 rounded-md p-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-6" min="0" max="100" />
                     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 select-none">%</span>
                </div>
            </td>
            <td className="p-3 text-center font-semibold text-gray-800">{netPrice}</td>
            <td className="p-3 text-center">
                <div className="flex items-center justify-center space-x-2 space-x-reverse">
                    {item.isNew && (
                         <button onClick={() => onToggleDefault(item.productId)} title="حفظ كصنف معتاد للمريض">
                            <StarIcon filled={isMarkedAsDefault} />
                        </button>
                    )}
                     <button onClick={() => onRemove(item.productId)} className="text-gray-400 hover:text-red-600 transition-colors" title="إزالة الصنف">
                        <TrashIcon />
                    </button>
                </div>
            </td>
        </tr>
    );
};


interface ProductAdderProps {
    products: Product[];
    onAdd: (product: Product) => void;
    existingIds: Set<string>;
}

const ProductAdder: React.FC<ProductAdderProps> = ({ products, onAdd, existingIds }) => {
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const availableProducts = products.filter(p => !existingIds.has(p.id));

    const handleAdd = () => {
        if (!selectedProductId) return;
        const productToAdd = products.find(p => p.id === selectedProductId);
        if (productToAdd) {
            onAdd(productToAdd);
            setSelectedProductId('');
        }
    };
    
    return (
        <div className="mt-6 flex items-center space-x-2 space-x-reverse border-t pt-4">
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option value="">اختر صنفاً جديداً لإضافته للفاتورة...</option>
                {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.price.toFixed(2)}</option>
                ))}
            </select>
            <button onClick={handleAdd} disabled={!selectedProductId} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed shrink-0">
                <PlusIcon />
                <span className="mr-2">إضافة</span>
            </button>
        </div>
    );
};


// --- Main App Component ---

const App: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>(() => loadFromStorage(LOCAL_STORAGE_KEYS.PATIENTS, []));
    const [products, setProducts] = useState<Product[]>(() => loadFromStorage(LOCAL_STORAGE_KEYS.PRODUCTS, []));
    const [patientMedications, setPatientMedications] = useState<PatientMedication[]>(() => loadFromStorage(LOCAL_STORAGE_KEYS.PATIENT_MEDICATIONS, []));
    
    const [selectedPatientId, setSelectedPatientId] = useState<string>('all');
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [newlyAddedDefaults, setNewlyAddedDefaults] = useState<Set<string>>(new Set());
    const [statusMessage, setStatusMessage] = useState<{text: string; type: 'success' | 'error'} | null>(null);
    
    // --- Effects to save data to localStorage ---
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    }, [patients]);
    
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }, [products]);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PATIENT_MEDICATIONS, JSON.stringify(patientMedications));
    }, [patientMedications]);


    useEffect(() => {
        let items: InvoiceItem[] = [];
        if (selectedPatientId === 'all') {
            items = products.map(p => ({ productId: p.id, name: p.name, price: p.price, quantity: 1, discount: 0 }));
        } else if (selectedPatientId) {
            const defaultProductIds = new Set(patientMedications.filter(pm => pm.patientId === selectedPatientId).map(pm => pm.productId));
            items = products.filter(p => defaultProductIds.has(p.id)).map(p => ({ productId: p.id, name: p.name, price: p.price, quantity: 1, discount: 0 }));
        }
        setInvoiceItems(items);
        setNewlyAddedDefaults(new Set());
    }, [selectedPatientId, products, patientMedications]);

    const handleUpdateItem = useCallback((updatedItem: InvoiceItem) => {
        setInvoiceItems(currentItems => currentItems.map(item => item.productId === updatedItem.productId ? updatedItem : item));
    }, []);

    const handleRemoveItem = useCallback((productId: string) => {
        setInvoiceItems(currentItems => currentItems.filter(item => item.productId !== productId));
        setNewlyAddedDefaults(currentDefaults => {
            const newDefaults = new Set(currentDefaults);
            newDefaults.delete(productId);
            return newDefaults;
        });
    }, []);

    const handleAddItem = useCallback((product: Product) => {
        setInvoiceItems(currentItems => [...currentItems, { productId: product.id, name: product.name, price: product.price, quantity: 1, discount: 0, isNew: true }]);
    }, []);

    const handleToggleDefault = useCallback((productId: string) => {
         setNewlyAddedDefaults(currentDefaults => {
            const newDefaults = new Set(currentDefaults);
            if (newDefaults.has(productId)) {
                newDefaults.delete(productId);
            } else {
                newDefaults.add(productId);
            }
            return newDefaults;
        });
    }, []);

    const totals = useMemo(() => {
        const subtotal = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const grandTotal = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity * (1 - item.discount / 100)), 0);
        const discount = subtotal - grandTotal;
        return { subtotal, discount, grandTotal };
    }, [invoiceItems]);
    
    const showStatusMessage = (text: string, type: 'success' | 'error') => {
        setStatusMessage({ text, type });
        setTimeout(() => setStatusMessage(null), 4000);
    };

    const handleSaveInvoice = () => {
        if (!selectedPatientId || selectedPatientId === 'all') {
            showStatusMessage('يرجى اختيار مريض لحفظ الفاتورة وتحديث أصنافه المعتادة.', 'error');
            return;
        }

        if(newlyAddedDefaults.size > 0) {
            const newMeds: PatientMedication[] = Array.from(newlyAddedDefaults).map((productId) => ({ patientId: selectedPatientId, productId }));
            setPatientMedications(currentMeds => [...currentMeds, ...newMeds]);
            showStatusMessage(`تم تحديث قائمة المريض بـ ${newMeds.length} صنف جديد بنجاح.`, 'success');
        } else {
            showStatusMessage('تم حفظ الفاتورة. لم يتم تغيير قائمة الأصناف المعتادة للمريض.', 'success');
        }
        setSelectedPatientId('all');
    };
    
    const handleExportPDF = () => {
        if(invoiceItems.length === 0) return;
        const patient = patients.find(p => p.id === selectedPatientId) || null;
        exportToPDF(patient, invoiceItems, totals);
    };

    // --- Data Management Handlers ---

    const handleAddPatient = useCallback((name: string) => {
        const newPatient: Patient = {
            id: `p_${Date.now()}`,
            name,
        };
        setPatients(current => [...current, newPatient]);
        showStatusMessage(`تمت إضافة المريض "${name}" بنجاح.`, 'success');
    }, []);
    
    const handleUpdatePatient = useCallback((id: string, name: string) => {
        setPatients(current => current.map(p => p.id === id ? { ...p, name } : p));
        showStatusMessage('تم تحديث اسم المريض بنجاح.', 'success');
    }, []);
    
    const handleDeletePatient = useCallback((id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المريض؟ سيتم حذف جميع الأدوية المعتادة المرتبطة به.')) {
            setPatients(current => current.filter(p => p.id !== id));
            setPatientMedications(current => current.filter(pm => pm.patientId !== id));
            if (selectedPatientId === id) {
                setSelectedPatientId('all');
            }
            showStatusMessage('تم حذف المريض بنجاح.', 'success');
        }
    }, [selectedPatientId]);

    const handleAddProduct = useCallback((name: string, price: number) => {
        const newProduct: Product = {
            id: `prod_${Date.now()}`,
            name,
            price,
        };
        setProducts(current => [...current, newProduct]);
        showStatusMessage(`تمت إضافة الصنف "${name}" بنجاح.`, 'success');
    }, []);

    const handleUpdateProduct = useCallback((id: string, name: string, price: number) => {
        setProducts(current => current.map(p => p.id === id ? { ...p, name, price } : p));
        // Also update it in the current invoice if present
        setInvoiceItems(current => current.map(item =>
            item.productId === id ? { ...item, name, price } : item
        ));
        showStatusMessage('تم تحديث الصنف بنجاح.', 'success');
    }, []);

    const handleDeleteProduct = useCallback((id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟ سيتم حذفه من قوائم جميع المرضى وفاتورتك الحالية.')) {
            setProducts(current => current.filter(p => p.id !== id));
            setPatientMedications(current => current.filter(pm => pm.productId !== id));
            setInvoiceItems(current => current.filter(item => item.productId !== id));
            showStatusMessage('تم حذف الصنف بنجاح.', 'success');
        }
    }, []);


    const existingItemIds = useMemo(() => new Set(invoiceItems.map(item => item.productId)), [invoiceItems]);

    return (
        <div className="font-sans min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">
                <header className="border-b-2 border-gray-200 pb-4 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">نظام الفواتير الذكي</h1>
                    <p className="text-gray-500 mt-1">إنشاء الفواتير بسرعة وكفاءة عبر قوالب المرضى</p>
                </header>

                <main>
                    <div className="mb-6">
                        <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-1">اختر المريض</label>
                        <select id="patient-select" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="block w-full md:w-1/3 p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            <option value="all">عرض كل الأصناف (بدون مريض)</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm text-right">
                             <thead className="text-xs text-gray-700 uppercase bg-gray-200">
                                <tr>
                                    <th scope="col" className="p-3 w-2/5 text-right">الصنف</th>
                                    <th scope="col" className="p-3 text-center">سعر البيع</th>
                                    <th scope="col" className="p-3 text-center">الكمية</th>
                                    <th scope="col" className="p-3 text-center">الخصم</th>
                                    <th scope="col" className="p-3 text-center">الصافي</th>
                                    <th scope="col" className="p-3 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceItems.length > 0 ? (
                                    invoiceItems.map(item => (
                                        <InvoiceRow key={item.productId} item={item} onUpdate={handleUpdateItem} onRemove={handleRemoveItem} onToggleDefault={handleToggleDefault} isMarkedAsDefault={newlyAddedDefaults.has(item.productId)} />
                                    ))
                                ) : (
                                    <tr><td colSpan={6} className="text-center p-8 text-gray-500">
                                        {patients.length === 0 && products.length === 0 ? 'يرجى إضافة بعض المرضى والأصناف من قسم "إدارة البيانات الأساسية" أدناه للبدء.' : 
                                         selectedPatientId !== 'all' ? 'لا توجد أصناف معتادة لهذا المريض. يمكنك إضافة أصناف جديدة أدناه.' : 'اختر مريضاً لعرض أصنافه المعتادة أو أضف أصنافًا جديدة.'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    { selectedPatientId !== 'all' && <ProductAdder products={products} onAdd={handleAddItem} existingIds={existingItemIds} /> }

                    <div className="mt-8 flex flex-col-reverse md:flex-row justify-between items-start gap-6">
                         <div className="flex space-x-2 space-x-reverse">
                           <button onClick={handleSaveInvoice} disabled={selectedPatientId === 'all' || (invoiceItems.length > 0 && newlyAddedDefaults.size === 0)} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
                               <SaveIcon /><span>حفظ التغييرات للمريض</span>
                            </button>
                             <button onClick={handleExportPDF} disabled={invoiceItems.length === 0} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400">
                               <ExportIcon /><span>تصدير PDF</span>
                            </button>
                        </div>

                        <div className="text-right w-full md:w-auto md:min-w-[300px]">
                           <div className="p-4 bg-gray-50 rounded-lg border space-y-2">
                                <div className="flex justify-between font-medium text-gray-600"><span>الإجمالي قبل الخصم:</span><span>{totals.subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-red-500"><span>مجموع الخصم:</span><span>{totals.discount.toFixed(2)}</span></div>
                                <hr className="my-1"/>
                                <div className="flex justify-between text-xl font-bold text-gray-800"><span>الإجمالي النهائي:</span><span>{totals.grandTotal.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                </main>
                <CollapsibleSection title="إدارة البيانات الأساسية (المرضى والأصناف)">
                    <DataManager
                        patients={patients}
                        products={products}
                        onAddPatient={handleAddPatient}
                        onUpdatePatient={handleUpdatePatient}
                        onDeletePatient={handleDeletePatient}
                        onAddProduct={handleAddProduct}
                        onUpdateProduct={handleUpdateProduct}
                        onDeleteProduct={handleDeleteProduct}
                    />
                </CollapsibleSection>
            </div>
            {statusMessage && (
                <div className={`fixed bottom-4 right-4 py-2 px-4 rounded-lg shadow-lg text-white ${statusMessage.type === 'success' ? 'bg-blue-500' : 'bg-red-500'}`}>
                    {statusMessage.text}
                </div>
            )}
        </div>
    );
};

export default App;