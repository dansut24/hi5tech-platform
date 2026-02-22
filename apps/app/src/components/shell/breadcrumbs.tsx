"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

function labelFromSeg(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ShellBreadcrumbs({
  className = "",
  maxCrumbWidth = 200,
}: {
  className?: string;
  maxCrumbWidth?: number;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Hide breadcrumbs for root pages like "/control" "/itsm" etc.
  if (segments.length <= 1) return null;

  const crumbs: { label: string; href: string }[] = [];
  let current = "";
  for (const seg of segments) {
    current += `/${seg}`;
    crumbs.push({ label: labelFromSeg(seg), href: current });
  }

  return (
    <nav aria-label="Breadcrumb" className={["overflow-hidden", className].join(" ")}>
      <ol className="flex items-center gap-1.5 text-xs opacity-60 whitespace-nowrap leading-none">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;

          return (
            <React.Fragment key={c.href}>
              {i > 0 ? (
                <li aria-hidden="true" className="inline-flex items-center leading-none">
                  <ChevronRight size={11} className="opacity-50 translate-y-[0.5px]" />
                </li>
              ) : null}

              <li className="min-w-0 inline-flex items-center leading-none">
                {isLast ? (
                  <span
                    className="font-medium opacity-100 truncate inline-flex items-center leading-none"
                    style={{ maxWidth: maxCrumbWidth }}
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link
                    href={c.href}
                    className="hover:opacity-100 transition truncate inline-flex items-center leading-none"
                    style={{ maxWidth: Math.max(120, Math.floor(maxCrumbWidth * 0.75)) }}
                  >
                    {c.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
