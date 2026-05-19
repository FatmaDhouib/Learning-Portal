'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, LayoutDashboard, LogIn, LogOut, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <BookOpen className="h-6 w-6" />
            <span>LearnHub</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            {isAuthenticated && (
              <Link href="/dashboard" className="hover:text-foreground transition-colors">My Learning</Link>
            )}
            {user?.role === 'admin' && (
              <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
            )}
          </div>

          {/* Auth actions */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Get Started
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-[120px] truncate">{user?.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b">
                      <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                      <p className="text-sm font-semibold truncate">{user?.email}</p>
                      <span className="inline-block mt-0.5 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 capitalize">
                        {user?.role}
                      </span>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={() => { setOpen(false); logout(); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
