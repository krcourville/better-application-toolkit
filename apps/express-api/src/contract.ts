import { extendZodWithOpenApi } from "@anatine/zod-openapi";
import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { usersContract } from "./users/contract";
import { errorsContract } from "./errors/contract";

const c = initContract();

extendZodWithOpenApi(z);

export const apiContract = c.router(
  {
    info: {
      method: "GET",
      path: "/",
      responses: {
        200: z.object({
          data: z.object({
            message: z
              .string()
              .openapi({
                example: "Better Application Toolkit - Express API Reference",
              }),
            version: z.string().openapi({ example: "1.0.0" }),
          }),
        }),
      },
    },
    users: usersContract,
    errors: errorsContract,
  },
  {
    pathPrefix: "/api",
  }
);
