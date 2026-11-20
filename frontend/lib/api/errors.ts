export type ApiErrorKind = "validation" | "not_found" | "network" | "server";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  fields: Record<string, string[]>;
  nonField: string[];

  constructor(
    kind: ApiErrorKind,
    options: {
      message?: string;
      status?: number;
      fields?: Record<string, string[]>;
      nonField?: string[];
    } = {},
  ) {
    super(options.message ?? kind);
    this.name = "ApiError";
    this.kind = kind;
    this.status = options.status;
    this.fields = options.fields ?? {};
    this.nonField = options.nonField ?? [];
  }
}

function toMessages(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

export function normalizeError(input: {
  response?: Response;
  error?: unknown;
  thrown?: unknown;
}): ApiError {
  const { response, error, thrown } = input;

  if (thrown !== undefined || !response) {
    return new ApiError("network", {
      message: thrown instanceof Error ? thrown.message : undefined,
    });
  }

  const status = response.status;

  if (status === 400) {
    const fields: Record<string, string[]> = {};
    let nonField: string[] = [];
    if (error && typeof error === "object" && !Array.isArray(error)) {
      for (const [key, value] of Object.entries(error)) {
        if (key === "non_field_errors" || key === "detail") {
          nonField = nonField.concat(toMessages(value));
        } else {
          fields[key] = toMessages(value);
        }
      }
    } else {
      nonField = toMessages(error);
    }
    return new ApiError("validation", { status, fields, nonField });
  }

  if (status === 404) {
    return new ApiError("not_found", { status });
  }

  return new ApiError("server", { status });
}
