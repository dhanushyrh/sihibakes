export interface BorzoContactPerson {
  phone: string;
  name?: string | null;
}

export interface BorzoPoint {
  address: string;
  latitude?: string;
  longitude?: string;
  contact_person?: BorzoContactPerson;
  client_order_id?: string | null;
  required_start_datetime?: string | null;
  required_finish_datetime?: string | null;
  note?: string | null;
  checkin_code?: string | null;
}

export interface BorzoOrderRequest {
  type?: string;
  matter: string;
  vehicle_type_id?: number;
  points: BorzoPoint[];
}

export interface BorzoPointResponse {
  point_id: number | null;
  address: string;
  latitude: string | null;
  longitude: string | null;
  required_start_datetime: string | null;
  required_finish_datetime: string | null;
  estimated_arrival_datetime: string | null;
  arrival_start_datetime: string | null;
  arrival_finish_datetime: string | null;
  contact_person: BorzoContactPerson | null;
  checkin_code: string | null;
  note: string | null;
}

export interface BorzoOrder {
  order_id: number;
  order_name: string | null;
  vehicle_type_id: number;
  status: string | null;
  status_description: string | null;
  matter: string;
  payment_amount: string | null;
  delivery_fee_amount: string | null;
  points: BorzoPointResponse[];
  courier: {
    name?: string;
    surname?: string;
    phone?: string;
  } | null;
}

export interface BorzoApiResponse<T> {
  is_successful: boolean;
  order?: T;
  courier?: {
    courier_id: number;
    surname: string;
    name: string;
    middlename: string | null;
    phone: string;
  } | null;
  errors?: string[];
  parameter_errors?: Record<string, unknown>;
}

export interface BorzoDeliveryQuote {
  delivery_fee_inr: number;
  payment_amount: string;
  warnings: string[];
}

export interface BorzoDispatchResult {
  borzo_order_id: string;
  delivery_otp: string;
  delivery_partner_name: string;
  estimated_arrival_display: string;
}
