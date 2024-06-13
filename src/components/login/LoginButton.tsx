"use client";

import { signIn } from "next-auth/react";

const LoginButton: React.FC = () => {
  return <button onClick={() => signIn()}>Sign in</button>;
};

export default LoginButton;
