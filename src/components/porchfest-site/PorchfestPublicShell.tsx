// @ts-nocheck
"use client";

import Footer from "./components/Footer";
import Nav from "./components/Nav";
import Board from "./pages/Board";
import Landing from "./pages/Landing";
import Sponsors from "./pages/Sponsors";

type PorchfestPublicPage = "landing" | "sponsors" | "board";

const PAGES = {
  landing: Landing,
  sponsors: Sponsors,
  board: Board,
} satisfies Record<PorchfestPublicPage, () => React.ReactNode>;

export function PorchfestPublicShell({
  page,
}: {
  readonly page: PorchfestPublicPage;
}) {
  const Page = PAGES[page];
  return (
    <>
      <Nav />
      <main>
        <Page />
      </main>
      <Footer />
    </>
  );
}
