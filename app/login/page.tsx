"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <div className="size-9 shrink-0 rounded-lg bg-brand text-white grid place-items-center font-semibold">
            N
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-brand">
              Natured Tranquility
            </div>
            <div className="text-[10px] text-black/50">Wellness Dashboard</div>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-xs text-ink/55">
          Enter your credentials to access the booking dashboard.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/70">Username</span>
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/70">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>

          {state.error && (
            <p className="text-xs text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
