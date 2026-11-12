import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/repositories/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await store.ensureInitialized();
  const { id } = await params;
  const revoked = await store.revokeMandate(id);

  if (!revoked) {
    return NextResponse.json(
      { success: false, error: `Mandate ${id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: revoked,
    message: `Mandate ${id} has been revoked. It can no longer authorize purchases.`,
  });
}

