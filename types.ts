export interface Patient {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface PatientMedication {
  patientId: string;
  productId: string;
  quantity: number; // The last-used/default quantity
  discount: number; // The last-used/default discount
}

export interface InvoiceItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
}