export interface SocketMessage {
  type: string;
  payload?: any;
}

export interface GlobalListener {
  event: string;
  handler: (data: any) => void;
  type: 'redux' | 'api';
}

export interface ComponentListener {
  event: string;
  componentId: string;
  handler: (data: any) => void;
}