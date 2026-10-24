export interface Robot {
  id: string;
  name: string;
  x: number;
  y: number;
  battery: number;
  status: 'Idle' | 'Moving' | 'Charging' | 'Error' | 'Offline';
  currentAreaId?: string;
  destination?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Area {
  id: string;
  name: string;
  level: number;
  mapUrl?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Station {
  id: string;
  name: string;
  stationType: 'pickup' | 'dropoff' | 'charging' | string;
  xCoord: number;
  yCoord: number;
  areaId: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}


export interface MoveRequest {
  x: number;
  y: number;
}

export interface StatusRequest {
  status: 'Idle' | 'Moving' | 'Charging' | 'Error' | 'Offline';
}

export interface FulfillmentRequest {
  orderId: string;
  robotId: string;
}

export interface LogTransfer {
  id: string;
  transferRequestId: string;
  robotId: string;
  statusResult: string;
  distanceTravelled: number | null;
  errorNotes: string | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  tableId?: string;
  tableNo?: string;
  storeId?: string;
  totalAmount?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}
