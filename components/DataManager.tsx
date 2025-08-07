import React, { useState } from 'react';
import { Patient, Product } from '../types';
import { PlusIcon } from './icons';

interface DataManagerProps {
    patients: Patient[];
    products: Product[];
    onAddPatient: (name: string) => void;
    onAddProduct: (name: string, price: number) => void;
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
                <span className="mr-2">إضافة مريض</span>
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
                className="block w-40 p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                min="0"
                step="0.01"
            />
            <button type="submit" className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shrink-0">
                <PlusIcon />
                <span className="mr-2">إضافة صنف</span>
            </button>
        </form>
    );
};

export const DataManager: React.FC<DataManagerProps> = ({ patients, products, onAddPatient, onAddProduct }) => {
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
                                <li key={p.id} className="p-2 bg-white rounded shadow-sm">{p.name}</li>
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
                                <li key={p.id} className="flex justify-between p-2 bg-white rounded shadow-sm">
                                    <span>{p.name}</span>
                                    <span className="font-mono text-gray-600">{p.price.toFixed(2)}</span>
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
