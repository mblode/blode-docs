interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

interface NavGroup {
  label: string;
  links: NavLink[];
}

export const siteConfig = {
  footerNav: [
    {
      label: "Product",
      links: [
        { href: "/pricing", label: "Pricing" },
        { href: "/docs", label: "Docs" },
      ],
    },
    {
      label: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "/blog", label: "Blog" },
      ],
    },
    {
      label: "Resources",
      links: [
        { href: "/docs/guides/proxy-vercel", label: "Proxy guides" },
        { href: "/docs/cli", label: "CLI" },
        { href: "/docs/api/overview", label: "API" },
        {
          external: true,
          href: "https://github.com/mblode/blodemd",
          label: "GitHub",
        },
      ],
    },
    {
      label: "Legal",
      links: [
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
        { href: "/security", label: "Security" },
      ],
    },
  ] as NavGroup[],
  links: {
    author: "https://matthewblode.com",
    email: "m@blode.co",
    github: "https://github.com/mblode/blodemd",
  },
  version: "0.0.9",
};
