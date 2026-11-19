import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { FOUNDATION_LOGO_PATH, INSTITUTION_NAME } from '../utils/spmbLogic.ts';

export type ActiveTab = 'login' | 'form' | 'receipt' | 'dashboard' | 'lookup' | 'fees' | 'admin';

interface TopBarProps {
  activeTab: ActiveTab;
  isAdmin: boolean;
  onNavigate: (tab: ActiveTab) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, isAdmin, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'login', label: 'Portal Masuk' },
    { id: 'fees', label: 'Informasi Biaya' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'lookup', label: 'Cek Status' },
    { id: 'admin', label: isAdmin ? 'Menu Admin' : 'Admin' },
  ];

  const handleNavClick = (id: ActiveTab) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E5E2]">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 min-h-14 sm:min-h-16 py-2 flex items-center justify-between gap-3 sm:gap-6">
        <a
          href="#portal-masuk"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('login');
          }}
          className="inline-flex items-center gap-2.5 min-w-0 font-display text-[11px] sm:text-xs lg:text-[13px] font-bold tracking-tight text-[#14532D] leading-snug focus-visible:outline-2 focus-visible:outline-[#14532D] rounded-sm"
        >
          <img
            src={FOUNDATION_LOGO_PATH}
            alt={`Logo ${INSTITUTION_NAME}`}
            className="w-8 h-8 rounded-md object-contain bg-white border border-[#E2E5E2] p-0.5 shrink-0"
          />
          <span className="line-clamp-2 sm:line-clamp-1">{INSTITUTION_NAME}</span>
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-[#4E5651] shrink-0"
        >
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'login' && (activeTab === 'form' || activeTab === 'receipt'));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-[#14532D] ${
                  isActive
                    ? 'text-[#14532D] border-[#14532D] font-semibold'
                    : 'text-[#4E5651] border-transparent hover:text-[#111815] hover:border-[#CBD2CC]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#D4D9D4] bg-white text-[#111815] hover:bg-[#F2F4F2]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E5E2] bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'login' && (activeTab === 'form' || activeTab === 'receipt'));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#14532D]/10 text-[#14532D] font-semibold'
                    : 'text-[#111815] hover:bg-[#F2F4F2]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
