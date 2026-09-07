"use client";

import { auth } from "@/libs/firebase";
import {
  AuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";
import toast from "react-hot-toast";
import Button from "./Button";
import Input from "./Input";

/** Pesan error Firebase mentah tidak layak ditampilkan ke user */
const messageFor = (error: unknown) => {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password";
    case "auth/email-already-in-use":
      return "Email is already registered";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Login cancelled";
    case "auth/account-exists-with-different-credential":
      return "This email is already registered with another provider";
    default:
      return error.message;
  }
};

/**
 * Pengganti komponen <Auth /> dari @supabase/auth-ui-react.
 * Modal ditutup oleh AuthModal begitu user terisi, jadi di sini tidak perlu
 * menutup apa pun sendiri.
 */
const AuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const { register, handleSubmit, reset } = useForm<FieldValues>({
    defaultValues: { email: "", password: "", name: "" },
  });

  const withProvider = async (provider: AuthProvider) => {
    setIsLoading(true);

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = async (values) => {
    setIsLoading(true);

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );

        if (values.name) {
          await updateProfile(credential.user, { displayName: values.name });
        }

        toast.success("Account created!");
      } else {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        toast.success("Logged in!");
      }

      reset();
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        <button
          type="button"
          onClick={() => withProvider(new GoogleAuthProvider())}
          disabled={isLoading}
          className="flex items-center justify-center gap-x-2 w-full rounded-full bg-neutral-700 px-3 py-3 text-white font-medium hover:opacity-75 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaGoogle size={18} />
          Continue with Google
        </button>
      </div>

      <div className="flex items-center gap-x-3">
        <div className="h-px flex-1 bg-neutral-700" />
        <span className="text-xs text-neutral-400">or</span>
        <div className="h-px flex-1 bg-neutral-700" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-3">
        {isSignUp && (
          <Input
            id="name"
            disabled={isLoading}
            placeholder="Your name"
            {...register("name")}
          />
        )}
        <Input
          id="email"
          type="email"
          disabled={isLoading}
          placeholder="Email address"
          {...register("email", { required: true })}
        />
        <Input
          id="password"
          type="password"
          disabled={isLoading}
          placeholder="Password"
          {...register("password", { required: true })}
        />
        <Button type="submit" disabled={isLoading}>
          {isSignUp ? "Sign up" : "Sign in"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setIsSignUp((current) => !current)}
        disabled={isLoading}
        className="text-sm text-neutral-400 hover:text-white transition"
      >
        {isSignUp
          ? "Already have an account? Sign in"
          : "Don't have an account? Sign up"}
      </button>
    </div>
  );
};

export default AuthForm;
