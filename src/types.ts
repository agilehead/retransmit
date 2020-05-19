import { IRouterContext } from "koa-router";
import { ClientOpts } from "redis";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/*
  Application Config
*/
export interface IAppConfig {
  cleanupIntervalMS?: number;
  routes: {
    [key: string]: {
      [key in HttpMethods]?: RouteConfig;
    };
  };
  redis?: {
    options?: ClientOpts;
  };
  handlers?: {
    request?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
    response?: (
      ctx: IRouterContext,
      response: any
    ) => Promise<{ handled: boolean }>;
  };
  genericErrors?: boolean;
  logError?: (error: string) => Promise<void>;
}

/*
  RouteHandler Config
*/
export type RouteConfig = {
  services: {
    [key: string]: ServiceHandlerConfig;
  };
  handlers?: {
    merge?: (result: CollatedResult) => Promise<CollatedResult>;
    request?: (ctx: IRouterContext) => Promise<{ handled: boolean }>;
    response?: (
      ctx: IRouterContext,
      response: any
    ) => Promise<{ handled: boolean }>;
  };
  genericErrors?: boolean;
};

/*
  Service Configuration
*/
export type ServiceHandlerConfig = (
  | {
      type: "redis";
      config: {
        requestChannel: string;
        responseChannel: string;
        numRequestChannels?: number;
        handlers?: {
          request?: (request: RedisRequest) => any;
        };
      };
    }
  | {
      type: "http";
      config: {
        url: string;
        rollbackUrl?: string;
        handlers?: {
          request?: (request: HttpRequest) => any;
        };
      };
    }
) & {
  awaitResponse?: boolean;
  merge?: boolean;
  abortOnError?: boolean;
  timeoutMS?: number;
  mergeField?: string;
  handlers?: {
    result?: (result: FetchedResult) => Promise<FetchedResult>;
  };
  logError?: (error: string) => Promise<void>;
};

/*
  This is the output of participating services.
*/
export type ServiceResult = {
  id: string;
  service: string;
  success: boolean;
  response?: HttpResponse;
};

/*
  Currently active requests
*/
export type ActiveRedisRequest = {
  responseChannel: string;
  id: string;
  path: string;
  timeoutTicks: number;
  method: HttpMethods;
  service: string;
  startTime: number;
  onSuccess: (result: FetchedResult) => void;
  onError: (result: FetchedResult) => void;
};

/*
  Output of processMessages()
*/
export type FetchedResult =
  | {
      time: number;
      ignore: false;
      path: string;
      method: HttpMethods;
      service: string;
      serviceResult: ServiceResult;
    }
  | {
      path: string;
      method: HttpMethods;
      service: string;
      time: number;
      ignore: true;
    };

/*
  Result of collating results from services
*/
export type CollatedResult =
  | {
      aborted: false;
      results: FetchedResult[];
    }
  | { aborted: true; errorResult: FetchedResult };

/*
  Request
*/
export type HttpRequest = {
  path: string;
  method: HttpMethods;
  params: {
    [key: string]: string;
  };
  query: {
    [key: string]: string;
  };
  body: any;
  headers: {
    [key: string]: string;
  };
};

export type RedisRequest = {
  id: string;
  type: string;
  data: HttpRequest;
};

/*
  Can be used to form an HttpResponse
*/
export type HttpResponse = {
  status?: number;
  redirect?: string;
  cookies?: {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    overwrite?: boolean;
  }[];
  content?: any;
  contentType?: string;
};
