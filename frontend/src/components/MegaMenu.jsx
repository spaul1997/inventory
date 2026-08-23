import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export function MegaMenu({ sections }) {
  const [openIndex, setOpenIndex] = useState(null);
  const containerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenIndex(null);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpenIndex(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setOpenIndex(null);
  }, [location.pathname]);

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-1">
      {sections.map((section, index) => {
        if (!section.children) {
          return (
            <NavLink
              key={section.label}
              to={section.to}
              className={({ isActive }) =>
                `flex items-center whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "border-[var(--primary)] text-white" : "border-transparent text-white/70 hover:text-white"
                }`
              }
            >
              {section.label}
            </NavLink>
          );
        }

        const isOpen = openIndex === index;
        const isSectionActive = section.children.some((child) => child.to === location.pathname);
        const wide = section.children.length > 6;
        const alignRight = index >= sections.length - 2;

        return (
          <div key={section.label} className="relative">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isOpen || isSectionActive ? "border-[var(--primary)] text-white" : "border-transparent text-white/70 hover:text-white"
              }`}
              aria-expanded={isOpen}
            >
              {section.label}
              <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div
                className={`absolute top-full z-30 mt-1 rounded-md border border-[var(--line)] bg-white p-2 shadow-lg ${
                  alignRight ? "right-0" : "left-0"
                } ${wide ? "grid w-[420px] grid-cols-2 gap-x-1" : "min-w-[220px]"}`}
              >
                {section.children.map((child) => (
                  <NavLink
                    key={child.label}
                    to={child.to}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2 text-sm leading-snug ${
                        isActive ? "bg-blue-50 font-medium text-[var(--primary)]" : "text-[var(--ink)] hover:bg-slate-50"
                      }`
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
