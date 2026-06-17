export interface Robot {
  id: string;
  name: string;
  x: number;
  y: number;
  battery: number;
  status: 'Idle' | 'Moving' | 'Charging' | 'Error' | 'Offline';
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
