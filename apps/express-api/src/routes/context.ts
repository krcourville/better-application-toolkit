import { getContext, setContextValue } from '@batkit/express-middleware';
import type { Request } from 'express';

export const contextHandlers = {
  show: async ({ req }: { req: Request }) => {
    // Access context from request
    const { context } = req;

    // Add some metadata to context
    setContextValue('operation', 'show-context');
    setContextValue('timestamp', Date.now());

    // Get context using utility function
    const currentContext = getContext();

    req.logger?.info('Context access demonstration', {
      hasContext: !!currentContext,
    });

    return {
      status: 200 as const,
      body: {
        message: 'Context information',
        requestId: context?.requestId,
        userId: context?.userId,
        metadata: context?.metadata,
        contextFromUtil: {
          requestId: currentContext?.requestId,
          hasLogger: !!currentContext?.logger,
        },
      },
    };
  },
  nested: async ({ req }: { req: Request }) => {
    req.logger?.info('Starting nested context demonstration');

    // Simulate nested function calls
    const result = nestedFunction1();

    return {
      status: 200 as const,
      body: {
        message: 'Nested context demonstration',
        result,
      },
    };
  },
};

function nestedFunction1(): string {
  const context = getContext();
  context?.logger.info('In nested function 1');

  setContextValue('function1', 'executed');

  return nestedFunction2();
}

function nestedFunction2(): string {
  const context = getContext();
  context?.logger.info('In nested function 2');

  setContextValue('function2', 'executed');

  return nestedFunction3();
}

function nestedFunction3(): string {
  const context = getContext();
  context?.logger.info('In nested function 3');

  setContextValue('function3', 'executed');

  return 'All functions executed with same context';
}
