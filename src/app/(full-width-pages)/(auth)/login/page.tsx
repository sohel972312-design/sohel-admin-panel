import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Admin Panel",
  description: "Sign in to the admin panel",
};

export default function LoginPage() {
  return <SignInForm />;
}
