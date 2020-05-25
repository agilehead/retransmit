import got from "got";

import { HttpRequest, HttpProxyConfig } from "../../../../types";

import * as configModule from "../../../../config";
import responseIsError from "../../../../lib/http/responseIsError";
import { makeHttpResponse } from "./makeHttpResponse";
import { HttpRouteConfig } from "../../../../types/httpRequests";

/*
  Make Promises for Http Services
  Make sure you don't await on this.
*/
export default async function rollback(
  requestId: string,
  request: HttpRequest,
  httpConfig: HttpProxyConfig
) {
  const config = configModule.get();
  const routeConfig = httpConfig.routes[request.path][
    request.method
  ] as HttpRouteConfig;

  for (const service of Object.keys(routeConfig.services)) {
    const serviceConfig = routeConfig.services[service];
    if (serviceConfig.type === "http" && serviceConfig.config.rollbackUrl) {
      const urlWithParamsReplaced = Object.keys(request.params).reduce(
        (acc, param) => {
          return acc.replace(`/:${param}`, `/${request.params[param]}`);
        },
        serviceConfig.config.rollbackUrl
      );
      const requestCopy = {
        ...request,
        path: urlWithParamsReplaced,
      };

      const modifiedRequest = serviceConfig.config.onRollbackRequest
        ? await serviceConfig.config.onRollbackRequest(requestCopy)
        : { handled: false as false, request: requestCopy };

      if (!modifiedRequest.handled) {
        const basicOptions = {
          searchParams: modifiedRequest.request.query,
          method: modifiedRequest.request.method,
          headers: modifiedRequest.request.headers,
          timeout: serviceConfig.timeout,
        };

        const options =
          typeof modifiedRequest.request.body === "string"
            ? {
                ...basicOptions,
                body: modifiedRequest.request.body,
              }
            : typeof modifiedRequest.request.body === "object"
            ? {
                ...basicOptions,
                json: modifiedRequest.request.body,
              }
            : basicOptions;

        got(modifiedRequest.request.path, options).catch(async (error) => {
          const httpResponse = error.response
            ? makeHttpResponse(error.response)
            : {
                status: 400,
                content: error.message,
              };

          if (responseIsError(httpResponse)) {
            if (serviceConfig.onError) {
              serviceConfig.onError(httpResponse, modifiedRequest.request);
            }
          }
        });
      }
    }
  }
}
