/** Thrown when the downloads API cannot be reached or answers with something unusable. */
export class PackageTrendsError extends Error {
  readonly package: string;
  readonly status?: number;

  constructor(message: string, options: { package: string; status?: number; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = "PackageTrendsError";
    this.package = options.package;
    this.status = options.status;
  }
}
