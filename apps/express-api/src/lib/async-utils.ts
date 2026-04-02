import { LoggerFacade } from "@batkit/logger";

export function delay(ms: number): Promise<void> {
  const logger = LoggerFacade.getLogger("async-utils.delay");
  logger.info("Delaying for ${ms}ms");
  return new Promise((resolve) => setTimeout(resolve, ms));
}
