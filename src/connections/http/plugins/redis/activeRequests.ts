import { HttpRequest, HttpMethods } from "../../../../types";
import { InvokeServiceResult, FetchedHttpRequestHandlerResponse } from "../../../../types/http";

export type ActiveHttpRequest = {
  id: string;
  timeoutAt: number;
  service: string;
  startTime: number;
  request: HttpRequest;
  route: string;
  method: HttpMethods;
  onResponse: (result: InvokeServiceResult) => void;
  stage: number | undefined;
  responses: FetchedHttpRequestHandlerResponse[];
};

let map: Map<string, ActiveHttpRequest> = new Map<string, ActiveHttpRequest>();
let initted = false;

export function init() {
  if (!initted) {
    initted = true;
    map = new Map<string, ActiveHttpRequest>();
  }
}

export function clear() {
  initted = false;
  map = new Map<string, ActiveHttpRequest>();
}

export function get() {
  if (!initted) {
    throw new Error(
      "activeRequests was not initted. Call init during application start."
    );
  } else {
    return map;
  }
}
