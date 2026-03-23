import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, title, body: msgBody, data } = body;

  if (!to) {
    return NextResponse.json({ error: "Missing push token" }, { status: 400 });
  }

  const payload = { to, title, body: msgBody, data };

  const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(payload),
  });

  if (!expoRes.ok) {
    const text = await expoRes.text();
    return NextResponse.json(
      { error: "Expo push failed", detail: text },
      { status: 502 },
    );
  }

  const result = await expoRes.json();
  return NextResponse.json(result);
}
