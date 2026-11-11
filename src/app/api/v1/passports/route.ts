import { NextResponse } from "next/server";
import { store } from "@/server/repositories/store";

export async function GET() {
  const passports = store.listPassports();
  return NextResponse.json({
    success: true,
    count: passports.length,
    data: passports,
  });
}
