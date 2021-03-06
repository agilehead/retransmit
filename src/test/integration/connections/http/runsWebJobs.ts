import { startWithConfiguration } from "../../../..";
import { startBackends, getResponse } from "../../../utils/http";
import { TestAppInstance } from "../../../test";
import random from "../../../../utils/random";
import {
  IAppConfig,
} from "../../../../types";
import { promisify } from "util";

function sleep(ms: number): Promise<void> {
  return new Promise((success) => {
    setTimeout(success, ms);
  });
}

export default async function (app: TestAppInstance) {
  const config: IAppConfig = {
    instanceId: random(),
    webJobs: {
      cleanupusers: {
        url: "http://localhost:6666/cleanup",
        interval: 50,
      },
    },
  };

  it("runs webjobs", async () => {
    const servers = await startWithConfiguration(
      undefined,
      "testinstance",
      config
    );

    let callCount = 0;
    // Start mock servers.
    const backendApps = startBackends([
      {
        port: 6666,
        routes: [
          {
            path: "/cleanup",
            method: "GET",
            handleResponse: async (ctx) => {
              callCount++;
              ctx.body = "hello, world";
            },
          },
        ],
      },
    ]);

    app.servers = {
      ...servers,
      mockHttpServers: backendApps,
    };

    await sleep(500);

    callCount.should.be.greaterThan(5);
  });
}
