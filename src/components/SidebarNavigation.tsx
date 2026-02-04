'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Map,
  Settings,
  Menu,
  X,
  Home,
  Shield,
  AlertTriangle,
  Database,
  Cpu,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SystemInfoModal from '@/components/SystemInfoModal';

interface SidebarNavigationProps {
  className?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function SidebarNavigation({ className = '', onCollapsedChange }: SidebarNavigationProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const pathname = usePathname();

  const handleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapsedChange?.(newState);
  };

  const navigationItems = [
    {
      icon: Home,
      label: 'Ana Sayfa',
      href: '/',
      enabled: true
    },

    {
      icon: Shield,
      label: 'Hasar Değerlendirme',
      href: '/hasar',
      enabled: true
    },
    {
      icon: AlertTriangle,
      label: 'Acil Durum Uyarıları',
      href: '/uyarilar',
      enabled: true
    },
    {
      icon: Database,
      label: 'Veri Raporları',
      href: '/raporlar',
      enabled: true
    },
    {
      icon: Cpu,
      label: 'Sistem Analitiği',
      href: '/analitik',
      enabled: true
    },
    {
      icon: Settings,
      label: 'Ayarlar',
      href: '/ayarlar',
      enabled: true
    }
  ];

  return (
    <>
      <SystemInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-900/90 backdrop-blur-md border-slate-700 text-white hover:bg-slate-800"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative top-0 left-0 h-full z-40
          bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${className}
        `}
      >
        {/* Header */}
        <div className={`p-4 border-b border-slate-700/50 ${isCollapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-lg font-bold text-white">Seismos</h1>
                  <p className="text-xs text-slate-400">İzleme Ağı</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={() => setShowInfo(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                title="Sistem Hakkında"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Collapse Button (Desktop only) */}
        <button
          onClick={handleCollapse}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-600 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Navigation */}
        <nav className={`p-3 space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={index}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`
                  flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} 
                  px-3 py-2.5 rounded-lg transition-all duration-200 group
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30'
                    : 'hover:bg-slate-800 cursor-pointer'
                  }
                `}
              >
                <div className={`
                  p-2 rounded-lg transition-all duration-200 group-hover:scale-105
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                  }
                `}>
                  <Icon className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {item.label}
                    </span>
                  </div>
                )}
                {isActive && !isCollapsed && (
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status Indicators - Only show when not collapsed */}
        {!isCollapsed && (
          <div className="absolute bottom-4 left-3 right-3 space-y-2">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-400">Sistem Aktif</span>
              </div>
              <span className="text-xs text-slate-500">80 Bina</span>
            </div>
          </div>
        )}

        {/* Collapsed Status Indicator */}
        {isCollapsed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="Sistem Aktif"></div>
          </div>
        )}
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
}