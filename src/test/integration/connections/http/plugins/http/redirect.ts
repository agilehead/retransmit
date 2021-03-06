import { startWithConfiguration } from "../../../../../..";
import { startBackends, getResponse } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../utils/random";
import got from "got";
import { IAppConfig } from "../../../../../../types";

export default async function (app: TestAppInstance) {
  it(`redirects`, async () => {
    const config: IAppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            GET: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                },
              },
            },
          },
        },
      },
    };

    const servers = await startWithConfiguration(
      undefined,
      "testinstance",
      config
    );

    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/users",
            method: "GET",
            handleResponse: async (ctx) => {
              ctx.redirect(
                `http://localhost:6666/v1/usermanage?n1=${ctx.query.name}&a1=${ctx.query.age}`
              );
            },
          },
          {
            path: "/v1/usermanage",
            method: "GET",
            handleResponse: async (ctx) => {
              ctx.body = `Redirected with query ${JSON.stringify(ctx.query)}`;
            },
          },
        ],
      },
    ]);

    app.servers = {
      ...servers,
      mockHttpServers: backendApps,
    };

    const { port } = app.servers.httpServer.address() as any;
    const promisedResponse = got(`http://localhost:${port}/users`, {
      method: "GET",
      searchParams: {
        name: "jeswin",
        age: "39",
      },
      retry: 0,
      followRedirect: true,
    });
    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal(
      `Redirected with query {"n1":"jeswin","a1":"39"}`
    );
  });
}
