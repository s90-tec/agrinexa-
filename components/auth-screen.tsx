"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/components/providers";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const schemaFor = (signup: boolean) => z.object({
  name: z.string().trim().optional(),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().optional(),
  password: z.string().min(signup ? 12 : 1, signup ? "Use at least 12 characters." : "Enter your password.").max(128),
}).superRefine((values, context) => {
  if (signup && !values.name) context.addIssue({ code: "custom", path: ["name"], message: "Enter your name." });
  if (values.phone && values.phone.length > 32) context.addIssue({ code: "custom", path: ["phone"], message: "Phone number is too long." });
});

type FormValues = { name?: string; email: string; phone?: string; password: string };

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const { accept } = useAuth();
  const [error, setError] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schemaFor(isSignup)),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      const result = isSignup
        ? await authApi.signup({ name: values.name ?? "", email: values.email, phone: values.phone || undefined, password: values.password })
        : await authApi.login(values.email, values.password);
      accept(result);
      router.replace("/dashboard");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to complete sign-in.");
    }
  });

  return (
    <main className="auth-layout">
      <section className="auth-visual" aria-label="AgriNexa field intelligence">
        <Link href="/login" className="auth-brand"><span className="brand-mark">A</span><span>AgriNexa</span></Link>
        <div className="auth-message">
          <span className="eyebrow">FIELD INTELLIGENCE, IN FOCUS</span>
          <h1>Make every acre<br />work smarter.</h1>
          <p>Turn field data into clear decisions, at the pace of your farm.</p>
        </div>
        <div className="auth-visual-footer"><span>Farm data</span><span>AI analysis</span><span>Farmer action</span></div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <Link href="/login" className="mobile-auth-brand"><span className="brand-mark">A</span> AgriNexa</Link>
          <p className="eyebrow">FARM INTELLIGENCE PLATFORM</p>
          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-subtitle">{isSignup ? "Connect your farm data to better decisions." : "Sign in to see what is happening across your fields."}</p>
          <form onSubmit={submit} className="auth-form" noValidate>
            {isSignup && <label>Full name<input autoComplete="name" placeholder="Your name" {...form.register("name")} />{form.formState.errors.name && <small>{form.formState.errors.name.message}</small>}</label>}
            <label>Email address<input type="email" autoComplete="email" placeholder="farmer@example.com" {...form.register("email")} />{form.formState.errors.email && <small>{form.formState.errors.email.message}</small>}</label>
            {isSignup && <label>Phone <span className="optional">Optional</span><input type="tel" autoComplete="tel" placeholder="+91" {...form.register("phone")} />{form.formState.errors.phone && <small>{form.formState.errors.phone.message}</small>}</label>}
            <label>Password<input type="password" autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 12 characters" : "Your password"} {...form.register("password")} />{form.formState.errors.password && <small>{form.formState.errors.password.message}</small>}</label>
            {!isSignup && <div className="auth-inline"><span>Secure session sign-in</span><Link href="/forgot-password">Forgot password?</Link></div>}
            {error && <div role="alert" className="form-error">{error}</div>}
            <button className="button-primary auth-submit" type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}</button>
          </form>
          <p className="auth-switch">{isSignup ? "Already have an account?" : "New to AgriNexa?"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p>
          <p className="auth-security">Credentials are sent directly to your AgriNexa API and kept only for this browser session.</p>
        </div>
      </section>
    </main>
  );
}

export function PasswordRecoveryNotice({ reset = false }: { reset?: boolean }) {
  return (
    <main className="recovery-page">
      <Link href="/login" className="auth-brand"><span className="brand-mark">A</span><span>AgriNexa</span></Link>
      <section className="panel recovery-panel">
        <p className="eyebrow">ACCOUNT ACCESS</p>
        <h1>{reset ? "Password reset" : "Password recovery"}</h1>
        <p>Password recovery is not enabled by this API yet. Contact your farm administrator to regain access.</p>
        <Link className="button-primary inline-button" href="/login">Return to sign in</Link>
      </section>
    </main>
  );
}