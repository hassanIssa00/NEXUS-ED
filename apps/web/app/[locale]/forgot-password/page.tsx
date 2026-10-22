"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
} from "lucide-react";
import { useAuth, isAuthenticationConfigured } from "@/contexts/auth-context";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const copy = isArabic
    ? {
        back: "العودة لتسجيل الدخول",
        title: "استعادة كلمة المرور",
        enterCode: "أدخل رمز التحقق",
        done: "تم تحديث كلمة المرور",
        requestDescription: "أدخل بريد حسابك لإرسال تعليمات استعادة كلمة المرور.",
        codeDescription: (address: string) => `أدخل الرمز المرسل إلى ${address} واختر كلمة مرور جديدة.`,
        linkDescription: "إذا كان البريد مرتبطًا بحساب، تحقق من صندوق الوارد واتبع رابط إعادة التعيين.",
        doneDescription: "تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.",
        unavailable: "خدمة الحسابات غير مهيأة حاليًا.",
        requestError: "تعذر إرسال طلب الاستعادة. حاول مرة أخرى لاحقًا.",
        mismatch: "كلمتا المرور غير متطابقتين.",
        confirmError: "تعذر تغيير كلمة المرور. راجع الرمز وحاول مرة أخرى.",
        email: "البريد الإلكتروني",
        send: "إرسال تعليمات الاستعادة",
        sending: "جارٍ الإرسال...",
        emailCode: "رمز البريد الإلكتروني",
        newPassword: "كلمة المرور الجديدة",
        confirmPassword: "تأكيد كلمة المرور",
        verify: "جارٍ التحقق...",
        changePassword: "تغيير كلمة المرور",
        resend: "إعادة إرسال الرمز",
        returnLogin: "العودة لتسجيل الدخول",
        requestAnother: "طلب رسالة أخرى",
      }
    : {
        back: "Back to sign in",
        title: "Reset your password",
        enterCode: "Enter the verification code",
        done: "Password updated",
        requestDescription: "Enter your account email to receive password reset instructions.",
        codeDescription: (address: string) => `Enter the code sent to ${address} and choose a new password.`,
        linkDescription: "If an account is associated with this email, check your inbox and follow the reset link.",
        doneDescription: "Your password has been changed. You can sign in now.",
        unavailable: "Account services are not configured right now.",
        requestError: "We could not send the reset request. Please try again later.",
        mismatch: "The passwords do not match.",
        confirmError: "We could not change your password. Check the code and try again.",
        email: "Email address",
        send: "Send reset instructions",
        sending: "Sending...",
        emailCode: "Email verification code",
        newPassword: "New password",
        confirmPassword: "Confirm password",
        verify: "Verifying...",
        changePassword: "Change password",
        resend: "Send another code",
        returnLogin: "Return to sign in",
        requestAnother: "Request another email",
      };
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const authConfigured = isAuthenticationConfigured();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stage, setStage] = useState<"request" | "verify" | "done">("request");
  const [delivery, setDelivery] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const method = await requestPasswordReset(email);
      setDelivery(method);
      setStage(method === "code" ? "verify" : "done");
    } catch (requestError: any) {
      setError(
        requestError?.message ||
          copy.requestError,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(copy.mismatch);
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(email, code, password);
      setStage("done");
    } catch (resetError: any) {
      setError(
        resetError?.message ||
          copy.confirmError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <Link
          href={`/${locale}/login`}
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowRight className={`h-4 w-4 ${isArabic ? "" : "rotate-180"}`} /> {copy.back}
        </Link>

        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            {stage === "request" ? (
              <Mail className="h-6 w-6" />
            ) : stage === "verify" ? (
              <KeyRound className="h-6 w-6" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {stage === "request"
              ? copy.title
              : stage === "verify"
                ? copy.enterCode
                : delivery === "link"
                  ? (isArabic ? "تحقق من بريدك الإلكتروني" : "Check your email")
                  : copy.done}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {stage === "request"
              ? copy.requestDescription
              : stage === "verify"
                ? copy.codeDescription(email)
                : delivery === "link"
                  ? copy.linkDescription
                  : copy.doneDescription}
          </p>
        </div>

        {!authConfigured && stage === "request" && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{copy.unavailable}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {stage === "request" && (
          <form onSubmit={handleRequest} className="space-y-5">
            <label className="block text-sm font-bold text-slate-700">
              {copy.email}
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
                dir="ltr"
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-left text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="name@example.com"
              />
            </label>
            <button
              disabled={loading || !authConfigured}
              className="h-12 w-full rounded-xl bg-blue-700 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? copy.sending : copy.send}
            </button>
          </form>
        )}

        {stage === "verify" && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              {copy.emailCode}
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                required
                dir="ltr"
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-center text-lg font-bold tracking-[0.4em] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="000000"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              {copy.newPassword}
              <span className="relative mt-2 block">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 px-3 pl-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </span>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              {copy.confirmPassword}
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              disabled={loading || code.length !== 6}
              className="h-12 w-full rounded-xl bg-blue-700 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? copy.verify : copy.changePassword}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("request");
                setError("");
              }}
              className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              {copy.resend}
            </button>
          </form>
        )}

        {stage === "done" && delivery === "code" && (
          <Link
          href={`/${locale}/login`}
            className="flex h-12 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white hover:bg-blue-800"
          >
            {copy.returnLogin}
          </Link>
        )}
        {stage === "done" && delivery === "link" && (
          <button
            onClick={() => {
              setStage("request");
              setDelivery(null);
            }}
            className="h-12 w-full rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {copy.requestAnother}
          </button>
        )}
      </section>
    </main>
  );
}
