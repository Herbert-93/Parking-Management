import { NextFunction, Request, Response } from "express";

/**
 * Wraps an async Express route handler so that any rejected promise (a
 * Firestore error, a missing index, anything) is passed to next(err) and
 * handled by the central error handler in index.ts — instead of becoming
 * an unhandled promise rejection.
 *
 * This matters a lot on Node 15+: an unhandled rejection terminates the
 * ENTIRE process by default. Without this wrapper, one bad query in one
 * request can crash the server for every other user connected to it at
 * that moment — which looks exactly like random "Failed to fetch" errors
 * that come and go. Every route in this app should be wrapped with this.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}