import { startWithConfiguration } from "../../../../../..";
import { startBackends, getResponse } from "../../../../../utils/http";
import { closeHttpServer } from "../../../../../utils/http";
import { TestAppInstance } from "../../../../../test";
import random from "../../../../../../lib/random";
import got from "got";
import { IAppConfig } from "../../../../../../types";

export default async function (app: TestAppInstance) {
  it(`maps headers`, async () => {
    const config: IAppConfig = {
      instanceId: random(),
      http: {
        routes: {
          "/users": {
            POST: {
              services: {
                userservice: {
                  type: "http" as "http",
                  url: "http://localhost:6666/users",
                  mapping: {
                    headers: {
                      "x-app-instance": "x-app-id",
                    },
                  },
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
            method: "POST",
            handleResponse: async (ctx) => {
              ctx.body = `Header was ${ctx.headers["x-app-id"]}`;
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
      method: "POST",
      headers: {
        "x-app-instance": "myinst",
      },
      json: { username: "jeswin" },
      retry: 0,
    });
    const serverResponse = await getResponse(promisedResponse);
    serverResponse.statusCode.should.equal(200);
    serverResponse.body.should.equal("Header was myinst");
  });
}
