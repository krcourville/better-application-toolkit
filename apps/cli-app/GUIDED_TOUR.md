# Guided Tour for cli-app

The goal of cli-app is demonstrate, via a simple node processing app,
usage of techniques that add context to logging while applying the DRY
principle.

## 1. Logging Configuration

1. Configuration starts in `./src/logging.ts`.
2. LoggerFacade is configured using the pino.js implementation.
3. And ContextualLoggerProvider is also configured (more on this below).
4. LoggerFacade does not perform any configuration of the pino.js logger, itself.
   LoggerFacade's only job is to provide a common interface for logging.  It is up to
   the LoggerFacade implementation to understand and configure the logging behavior.
5. LoggerFacade is re-exported.  This is an optional step that can accomplish a couple of things:
   - Ensures the logging configuration is applied first.  Otherwise, one has to be certain to
     include `import logging.ts` at the entry point of the application.
   - Avoids having to reference a 3rd party module throughout the application (`@batkit/logger` in this case)
     which allows the LoggerFacade to be swapped out in one place, should this be desired.

## 2. Adding Context with Named Loggers

1. `cli-app` can be run via `pnpm cli`.
2. LoggerFacade enforces the use of named loggers.
3. A named logger is a logger instance initialized with a `name` property which is appended to every log
   entry.
4. The logger name adds context!
5. Depending on code style, the name can include a module, class, and/or function name.
6. Review `./src/index.ts`.
7. Run the app and overserve which emitted logs include the logger name.
8. When debugging, logger names are often useful to filter down logs to a particular area of code.  And
   without any additional context, you will at least know the module, class, or function name from which
   a log originated.

## 3. Add Context for an Entire Call Stack


