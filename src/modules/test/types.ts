// src/modules/test/types.ts
export interface TestCounter {
  id: string;
  counterId: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebSocketConnection {
  id: string;
  connectionId: string;
  counterId: string | null;
  userId: string | null;
  connectedAt: Date;
  expiresAt: Date;
}

export interface CounterIncrementRequest {
  incrementBy?: number;
}

export interface CounterResponse {
  success: boolean;
  counter?: TestCounter;
  message?: string;
}

export interface BroadcastPayload {
  counterId: string;
  updateData: {
    type: string;
    counterId: string;
    value: number;
    timestamp: Date;
  };
}
