
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
}

export interface InvoiceItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  isNew?: boolean; // To track items added during the session to show the "save as default" option
}
