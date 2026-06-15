import { NextRequest, NextResponse } from "next/server";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { createLogger } from "@/lib/middleware/logger";
import {
  getRecordById,
  updateRecord,
  deleteRecord,
} from "@/lib/services/financial-sheets.service";
import {
  errorToApiResponse,
  getStatusCode,
  toApiResponse,
  AppError,
} from "@/lib/utils/error-handler";

export const runtime = "nodejs";
export const maxDuration = 20;

const logger = createLogger("RecordByIdRoute");

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/records/[id]
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  const { id } = await params;
  const record = await getRecordById(id);
  if (!record) {
    return NextResponse.json(
      errorToApiResponse(new AppError("Record not found", 404)),
      { status: 404 }
    );
  }

  return NextResponse.json(toApiResponse(record));
}

// PUT /api/records/[id]
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      errorToApiResponse(new AppError("Invalid JSON body", 400)),
      { status: 400 }
    );
  }

  const { id } = await params;
  try {
    const updated = await updateRecord(id, body as never);
    if (!updated) {
      return NextResponse.json(
        errorToApiResponse(new AppError("Record not found", 404)),
        { status: 404 }
      );
    }
    logger.info("Record updated via API", { id });
    return NextResponse.json(toApiResponse(updated));
  } catch (error) {
    logger.error("PUT /api/records/[id] failed", error);
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }
}

// DELETE /api/records/[id]
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  const { id } = await params;
  try {
    const deleted = await deleteRecord(id);
    if (!deleted) {
      return NextResponse.json(
        errorToApiResponse(new AppError("Record not found", 404)),
        { status: 404 }
      );
    }
    logger.info("Record deleted via API", { id });
    return NextResponse.json(toApiResponse({ deleted: true, id }));
  } catch (error) {
    logger.error("DELETE /api/records/[id] failed", error);
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
