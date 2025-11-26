// src/app/api/test/route.ts
import { NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

export const runtime = "nodejs";

export async function GET() {
  try {
    const id = process.env.REDDIT_CLIENT_ID;
    const secret = process.env.REDDIT_CLIENT_SECRET;
    const refresh = process.env.REDDIT_REFRESH_TOKEN;

    return NextResponse.json({
      ok: true,
      env_loaded: {
        client_id: id ? `${id.substring(0, 8)}...` : "MISSING",
        client_secret: secret ? "SET" : "EMPTY",
        refresh_token: refresh ? `${refresh.substring(0, 8)}...` : "MISSING",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}