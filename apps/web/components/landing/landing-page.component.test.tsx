import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LandingPage } from "./landing-page";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("LandingPage", () => {
  it("renders the hero and primary CTA", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: "Launch a docs platform that feels handcrafted.",
      })
    ).toBeInTheDocument();

    const cta = screen.getAllByRole("link", { name: "Start now" })[0];
    expect(cta).toHaveAttribute("href", "https://dashboard.neue.com/signup");

    expect(screen.getByPlaceholderText("Work email")).toBeInTheDocument();
  });
});
