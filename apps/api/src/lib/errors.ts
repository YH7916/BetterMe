export class AppError extends Error {
  constructor(public status: 400 | 403 | 404, public code: string, message: string) {
    super(message);
  }
  static badRequest(msg: string, code = 'BAD_REQUEST') { return new AppError(400, code, msg); }
  static forbidden(msg: string, code = 'FORBIDDEN') { return new AppError(403, code, msg); }
  static notFound(msg: string, code = 'NOT_FOUND') { return new AppError(404, code, msg); }
}
