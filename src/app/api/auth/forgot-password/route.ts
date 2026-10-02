import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

// In a real app, we'd email a reset link. For this prototype, we mark a reset
// token request as acknowledged and tell the user to check their email.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    const email = parsed.data.email.toLowerCase().trim();

    // Always respond the same way to prevent email enumeration
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      // In production: generate token + send email. Here we just acknowledge.
    }
    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for this email, password reset instructions have been sent.",
    });
  } catch (e) {
    console.error("[forgot-password] error", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
