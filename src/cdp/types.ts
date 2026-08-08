export interface CdpTarget {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

export interface CdpError {
  code: number;
  message: string;
  data?: unknown;
}

export interface CdpResponse<T = unknown> {
  id: number;
  result?: T;
  error?: CdpError;
}

export interface CdpEvent {
  method: string;
  params?: unknown;
}
