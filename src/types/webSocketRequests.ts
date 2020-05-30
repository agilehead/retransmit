import { HttpRequest } from ".";

/*
  Web Socket Route Config
*/
export type WebSocketRouteConfig = {
  services: {
    [key: string]: WebSocketHandlerConfig;
  };
  onConnect?: (
    requestId: string,
    message: string
  ) => Promise<
    { drop: true } | { drop: false; request: WebSocketConnectRequest }
  >;
  onDisconnect?: (requestId: string) => any;
  onRequest?: (
    requestId: string,
    message: string
  ) => Promise<{ handled: true; request: string } | { handled: false }>;
  onResponse?: (
    requestId: string,
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
  onError?: (requestId: string, response: any) => any;
};

/*
  Service Configuration.
*/
export type WebSocketHandlerConfigBase = {
  onConnect?: (
    requestId: string,
    message: string
  ) => Promise<
    { drop: true } | { drop: false; request: WebSocketConnectRequest }
  >;
  onResponse?: (
    requestId: string,
    response: WebSocketResponse
  ) => Promise<WebSocketResponse>;
};

export type HttpServiceWebSocketHandlerConfig = {
  type: "http";
  pollingInterval: number;
  onRequest?: (
    requestId: string,
    request: HttpRequest
  ) => Promise<
    | { handled: true; response: WebSocketResponse }
    | { handled: false; request: HttpRequest }
  >;
  config: {
    url: string;
    onConnectUrl: string;
    onDisconnectUrl: string;
  };
} & WebSocketHandlerConfigBase;

export type RedisServiceWebSocketHandlerConfig = {
  type: "redis";
  onRequest?: (
    requestId: string,
    request: RedisServiceWebSocketMessageRequest
  ) => Promise<
    | { handled: true; response: WebSocketResponse }
    | { handled: false; request: RedisServiceWebSocketRequest }
  >;
  config: {
    requestChannel: string;
    numRequestChannels?: number;
  };
} & WebSocketHandlerConfigBase;

export type WebSocketHandlerConfig =
  | RedisServiceWebSocketHandlerConfig
  | HttpServiceWebSocketHandlerConfig;

/*
  WebSocket Requests and Responses
*/

export type WebSocketMessageRequest = {
  type: "message";
  request: string;
} & WebSocketRequestBase;

export type WebSocketConnectRequest = {
  type: "connect";
} & WebSocketRequestBase;

export type WebSocketDisconnectRequest = {
  type: "disconnect";
} & WebSocketRequestBase;

export type WebSocketNotConnectedRequest = {
  type: "notconnected";
} & WebSocketRequestBase;

export type WebSocketResponse = {
  id: string;
  type: "message" | "disconnect";
  route: string;
  service: string;
  response: string;
};

/*
  Requests and Responses for Http Services
*/
export type HttpServiceWebSocketMessageRequest = WebSocketMessageRequest;
export type HttpServiceWebSocketConnectRequest = WebSocketConnectRequest;

export type HttpServiceWebSocketRequest =
  | HttpServiceWebSocketMessageRequest
  | HttpServiceWebSocketConnectRequest
  | WebSocketDisconnectRequest
  | WebSocketNotConnectedRequest;

export type HttpServiceWebSocketResponse = {
  id: string;
  service: string;
  response: string;
};

/*
  Requests and Responses for Redis-based Services
*/
export type WebSocketRequestBase = {
  id: string;
  route: string;
};

export type RedisServiceWebSocketMessageRequest = {
  responseChannel: string;
} & WebSocketMessageRequest;

export type RedisServiceWebSocketConnectRequest = {
  responseChannel: string;
} & WebSocketConnectRequest;

export type RedisServiceWebSocketRequest =
  | RedisServiceWebSocketMessageRequest
  | RedisServiceWebSocketConnectRequest
  | WebSocketDisconnectRequest
  | WebSocketNotConnectedRequest;
