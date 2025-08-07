import React, { useState } from 'react';
import { Patient, Product } from '../types';
import { PlusIcon, EditIcon, TrashIcon, SaveIcon } from './icons';

interface DataManagerProps {
    patients: Patient[];
    products: Product[];
    onAddPatient: (name: string) => void;
    onUpdatePatient: (id: string, name: string) => void;
    onDeletePatient: (id: string) => void;
    onAddProduct: (name: string, price: number) => void;
    onUpdateProduct: (id: string, name: string, price: number) => void;
    onDeleteProduct: (id: string) => void;
}

const PatientForm: React.FC<{ onAdd: (name: string) => void }> = ({ onAdd }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAdd(name.trim());
            setName('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 space-x-reverse">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم المريض الجديد"
                className="block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
            />
            <button type="submit" className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shrink-0">
                <PlusIcon />
                <span className="mr-2 hidden sm:inline">إضافة</span>
            </button>
        </form>
    );
};

const ProductForm: React.FC<{ onAdd: (name: string, price: number) => void }> = ({ onAdd }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const priceValue = parseFloat(price);
        if (name.trim() && !isNaN(priceValue) && priceValue >= 0) {
            onAdd(name.trim(), priceValue);
            setName('');
            setPrice('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 space-x-reverse">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم الصنف الجديد"
                className="block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
            />
            <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="السعر"
                className="block w-28 p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                min="0"
                step="0.01"
            />
            <button type="submit" className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shrink-0">
                <PlusIcon />
                <span className="mr-2 hidden sm:inline">إضافة</span>
            </button>
        </form>
    );
};

export const DataManager: React.FC<DataManagerProps> = ({
    patients, products, onAddPatient, onUpdatePatient, onDeletePatient,
    onAddProduct, onUpdateProduct, onDeleteProduct
}) => {
    const [editingPatient, setEditingPatient] = useState<{ id: string, name: string } | null>(null);
    const [editingProduct, setEditingProduct] = useState<{ id: string, name: string, price: string } | null>(null);

    const handlePatientEdit = (patient: Patient) => {
        setEditingPatient({ id: patient.id, name: patient.name });
    };

    const handlePatientSave = () => {
        if (editingPatient && editingPatient.name.trim()) {
            onUpdatePatient(editingPatient.id, editingPatient.name.trim());
            setEditingPatient(null);
        }
    };

    const handleProductEdit = (product: Product) => {
        setEditingProduct({ id: product.id, name: product.name, price: product.price.toString() });
    };
    
    const handleProductSave = () => {
        if (editingProduct && editingProduct.name.trim()) {
            const priceValue = parseFloat(editingProduct.price);
            if (!isNaN(priceValue) && priceValue >= 0) {
                onUpdateProduct(editingProduct.id, editingProduct.name.trim(), priceValue);
                setEditingProduct(null);
            }
        }
    };


    return (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Patient Management */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">إدارة المرضى</h3>
                <PatientForm onAdd={onAddPatient} />
                <div className="max-h-60 overflow-y-auto border rounded-md p-2 bg-gray-50">
                    {patients.length > 0 ? (
                        <ul className="space-y-1">
                            {patients.map(p => (
                                <li key={p.id} className="flex items-center justify-between p-2 bg-white rounded shadow-sm hover:bg-gray-50">
                                    {editingPatient?.id === p.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editingPatient.name}
                                                onChange={(e) => setEditingPatient({ ...editingPatient, name: e.target.value })}
                                                className="block w-full p-1 border border-blue-400 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                autoFocus
                                            />
                                            <div className="flex items-center space-x-1 space-x-reverse mr-2 shrink-0">
                                                <button onClick={handlePatientSave} className="p-1 text-green-600 hover:text-green-800"><SaveIcon/></button>
                                                <button onClick={() => setEditingPatient(null)} className="p-1 text-gray-500 hover:text-gray-700">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="truncate">{p.name}</span>
                                            <div className="flex items-center space-x-1 space-x-reverse mr-2 shrink-0">
                                                <button onClick={() => handlePatientEdit(p)} className="p-1 text-blue-600 hover:text-blue-800" title="تعديل"><EditIcon/></button>
                                                <button onClick={() => onDeletePatient(p.id)} className="p-1 text-red-600 hover:text-red-800" title="حذف"><TrashIcon/></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-4">لا يوجد مرضى. أضف مريضاً جديداً للبدء.</p>
                    )}
                </div>
            </div>

            {/* Product Management */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">إدارة الأصناف</h3>
                <ProductForm onAdd={onAddProduct} />
                 <div className="max-h-60 overflow-y-auto border rounded-md p-2 bg-gray-50">
                    {products.length > 0 ? (
                        <ul className="space-y-1">
                            {products.map(p => (
                                <li key={p.id} className="flex items-center justify-between p-2 bg-white rounded shadow-sm hover:bg-gray-50">
                                     {editingProduct?.id === p.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editingProduct.name}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                                className="block w-full p-1 border border-blue-400 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                autoFocus
                                            />
                                            <input
                                                type="number"
                                                value={editingProduct.price}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                                                className="block w-24 p-1 mx-2 border border-blue-400 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            />
                                            <div className="flex items-center space-x-1 space-x-reverse mr-2 shrink-0">
                                                <button onClick={handleProductSave} className="p-1 text-green-600 hover:text-green-800"><SaveIcon/></button>
                                                <button onClick={() => setEditingProduct(null)} className="p-1 text-gray-500 hover:text-gray-700">
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="truncate flex-grow">{p.name}</span>
                                            <span className="font-mono text-gray-600 mx-2">{p.price.toFixed(2)}</span>
                                            <div className="flex items-center space-x-1 space-x-reverse mr-2 shrink-0">
                                                <button onClick={() => handleProductEdit(p)} className="p-1 text-blue-600 hover:text-blue-800" title="تعديل"><EditIcon/></button>
                                                <button onClick={() => onDeleteProduct(p.id)} className="p-1 text-red-600 hover:text-red-800" title="حذف"><TrashIcon/></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-4">لا توجد أصناف. أضف صنفاً جديداً للبدء.</p>
                    )}
                </div>
            </div>
        </div>
    );
};