"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import BrandBlock, { type BrandingSettings } from "../components/BrandBlock";
import { useToast } from "../components/Toast";
import {
  getSharePageLinkAction,
  loginAction,
  type LoginState,
  type SharePageLinkResult,
} from "./actions";

const initialState: LoginState = {};

export default function LoginForm({
  branding,
}: {
  branding: BrandingSettings;
}) {
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePending, setSharePending] = useState(false);
  const lastNotifiedSubmissionId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.submissionId === undefined || !state.error) return;
    if (lastNotifiedSubmissionId.current === state.submissionId) return;

    lastNotifiedSubmissionId.current = state.submissionId;
    showToast({
      tone: "error",
      title: "Sign in failed",
      description: state.error,
    });
  }, [state.error, state.submissionId, showToast]);

  async function handleSharePage() {
    setShareUrl(null);
    setSharePending(true);

    const link = getSharePageLinkAction();

    try {
      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard?.write
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": link.then((result) => {
              if (!result.ok) throw new Error(result.error);
              return new Blob([result.url], { type: "text/plain" });
            }),
          }),
        ]);
      } else {
        const result = await link;
        if (!result.ok) {
          showShareLinkError(result.error);
          return;
        }
        await navigator.clipboard.writeText(result.url);
      }

      const result = await link;
      if (!result.ok) {
        showShareLinkError(result.error);
        return;
      }

      showToast({
        title: "Link copied",
        description: result.url,
      });
    } catch {
      const result = await getSettledShareLink(link);

      if (result?.ok) {
        setShareUrl(result.url);
        showToast({
          tone: "error",
          title: "Copy blocked",
          description: "Copy the link manually.",
        });
        return;
      }

      showShareLinkError(result?.error ?? "Could not detect a LAN address.");
    } finally {
      setSharePending(false);
    }
  }

  function showShareLinkError(description: string) {
    showToast({
      tone: "error",
      title: "Share link unavailable",
      description,
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <BrandBlock branding={branding} />

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

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSharePage}
          disabled={sharePending}
          className="mt-4 w-full rounded-full border border-black/10 bg-white px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sharePending ? "Preparing link..." : "Share Page"}
        </button>

        {shareUrl && (
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink/70">
              Copy manually
            </span>
            <input
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="rounded-md border border-black/10 bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
        )}
      </div>
    </main>
  );
}

async function getSettledShareLink(
  link: Promise<SharePageLinkResult>,
): Promise<SharePageLinkResult | null> {
  try {
    return await link;
  } catch {
    return null;
  }
}
