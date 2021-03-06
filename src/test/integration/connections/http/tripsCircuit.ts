import { startWithConfiguration } from "../../../..";
import { startBackends, getResponse } from "../../../utils/http";
import { TestAppInstance } from "../../../test";
import random from "../../../../utils/random";
import got from "got";
import {
  IAppConfig,
  RedisStateConfig,
  InMemoryStateConfig,
} from "../../../../types";
import { Response } from "got/dist/source/core";
import { createClient } from "redis";
import { promisify } from "util";

const client = createClient();
const redisFlushAll = promisify(client.flushdb);

function sleep(ms: number): Promise<void> {
  return new Promise((success) => {
    setTimeout(success, ms);
  });
}

export default async function (app: TestAppInstance) {
  function makeConfig(modification: (config: IAppConfig) => IAppConfig) {
    const baseConfig: IAppConfig = {
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
                messagingservice: {
                  type: "http" as "http",
                  url: "http://localhost:6667/users",
                },
              },
            },
          },
        },
        circuitBreaker: {
          maxErrors: 3,
          duration: 150,
        },
      },
    };

    return modification(baseConfig);
  }

  const tests: [string, boolean, IAppConfig][] = [
    [
      "trips the circuit with in-memory state",
      false,
      makeConfig((cfg) => {
        cfg.state = {
          type: "memory",
        } as InMemoryStateConfig;
        return cfg;
      }),
    ],
    [
      "trips the circuit with redis state",
      true,
      makeConfig((cfg) => {
        cfg.state = {
          type: "redis",
        } as RedisStateConfig;
        return cfg;
      }),
    ],
  ];

  for (const [name, isRedis, config] of tests) {
    it(name, async () => {
      if (isRedis) {
        const client = createClient();
        await redisFlushAll.call(client);
        await sleep(100);
      }

      const servers = await startWithConfiguration(
        undefined,
        "testinstance",
        config
      );

      let userServiceCallCount = 0;
      let messagingServiceCallCount = 0;
      // Start mock servers.
      const backendApps = startBackends([
        {
          port: 6666,
          routes: [
            {
              path: "/users",
              method: "GET",
              handleResponse: async (ctx) => {
                userServiceCallCount++;
                ctx.body = {
                  user: 1,
                };
              },
            },
          ],
        },
        {
          port: 6667,
          routes: [
            {
              path: "/users",
              method: "GET",
              handleResponse: async (ctx) => {
                messagingServiceCallCount++;
                if (messagingServiceCallCount <= 3) {
                  ctx.status = 500;
                  ctx.body = "Something happened.";
                } else {
                  ctx.body = {
                    messages: 10,
                  };
                }
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

      const promisedResponses: Promise<Response<string>>[] = [];

      for (let i = 0; i <= 5; i++) {
        const promisedResponse = got(`http://localhost:${port}/users`, {
          method: "GET",
          retry: 0,
        });
        promisedResponses.push(getResponse(promisedResponse));

        if (i < 3) {
          await sleep(25);
        }

        if (i === 3) {
          await sleep(50);
        }

        if (i === 4) {
          await sleep(200);
        }
      }

      const responses = await Promise.all(promisedResponses);

      userServiceCallCount.should.equal(4);
      messagingServiceCallCount.should.equal(4);

      responses[0].statusCode.should.equal(500);
      responses[0].body.should.equal("Something happened.");
      responses[2].statusCode.should.equal(500);
      responses[2].body.should.equal("Something happened.");
      responses[3].statusCode.should.equal(503);
      responses[3].body.should.equal("Busy.");
      responses[5].statusCode.should.equal(200);
      JSON.parse(responses[5].body).should.deepEqual({ user: 1, messages: 10 });
    }).timeout(5000);
  }
}
