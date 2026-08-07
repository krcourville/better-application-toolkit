import { LoggerFacade } from "@batkit/logger";
import { setTimeout as delayFor } from "node:timers/promises";

export function delay(ms: number): Promise<void> {
  const logger = LoggerFacade.getLogger("async-utils.delay");
  logger.info(`Delaying for ${ms}ms`);
  return delayFor(ms);
}
