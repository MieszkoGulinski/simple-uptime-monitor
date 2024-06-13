import NextAuth from "next-auth";
import { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
// Import more providers if needed

const providers: Provider[] = [];

if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
});
