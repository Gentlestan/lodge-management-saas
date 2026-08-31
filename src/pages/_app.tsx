
import "@/styles/globals.css";

import type { AppProps } from "next/app";
import { useRouter } from "next/router";

import AppLayout from "@/components/layout/AppLayout";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const isLoginPage = router.pathname === "/login";

  if (isLoginPage) {
    return <Component {...pageProps} />;
  }

  return (
    <AppLayout>
      <Component {...pageProps} />
    </AppLayout>
  );
}
