"use client";

import { useState } from "react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">
                🥊
              </div>
              <span className="text-xl font-bold">BlazePose Coach</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">
                How It Works
              </a>
              <a
                href="/login"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Login
              </a>
              <a
                href="/register"
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-6 py-2.5 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Get Started
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-3">
              <a href="#features" className="block text-gray-300 hover:text-white">
                Features
              </a>
              <a href="#how-it-works" className="block text-gray-300 hover:text-white">
                How It Works
              </a>
              <a href="#pricing" className="block text-gray-300 hover:text-white">
                Pricing
              </a>
              <a href="/login" className="block text-gray-300 hover:text-white">
                Login
              </a>
              <a
                href="/register"
                className="block bg-gradient-to-r from-red-500 to-pink-600 px-6 py-2.5 rounded-lg font-semibold text-center"
              >
                Get Started
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Master Your Boxing
              <span className="block bg-gradient-to-r from-red-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                With AI Precision
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 leading-relaxed">
              Real-time pose estimation and personalized feedback to perfect every jab, hook, and uppercut. Train like a pro from anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl"
              >
                Start Training Free
              </a>
              <a
                href="#how-it-works"
                className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-4 rounded-xl font-bold text-lg transition-all"
              >
                Watch Demo
              </a>
            </div>
        </div>
                </div>

      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-gray-400">
              Powered by BlazePose AI technology for precision training
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                🎯
              </div>
              <h3 className="text-2xl font-bold mb-3">Real-Time Feedback</h3>
              <p className="text-gray-400 leading-relaxed">
                Get instant analysis of your form and technique with our AI-powered pose detection system.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                📊
              </div>
              <h3 className="text-2xl font-bold mb-3">Progress Tracking</h3>
              <p className="text-gray-400 leading-relaxed">
                Monitor your improvement over time with detailed analytics and performance metrics.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                🥊
              </div>
              <h3 className="text-2xl font-bold mb-3">12+ Techniques</h3>
              <p className="text-gray-400 leading-relaxed">
                Practice jabs, hooks, uppercuts, kicks, and advanced combinations with guided training.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                🎥
              </div>
              <h3 className="text-2xl font-bold mb-3">Session Recording</h3>
              <p className="text-gray-400 leading-relaxed">
                Review your training sessions with video playback and detailed form breakdown.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                ⚡
              </div>
              <h3 className="text-2xl font-bold mb-3">Personalized Plans</h3>
              <p className="text-gray-400 leading-relaxed">
                Get custom training routines based on your skill level and goals.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                🏆
              </div>
              <h3 className="text-2xl font-bold mb-3">Achievement System</h3>
              <p className="text-gray-400 leading-relaxed">
                Unlock badges and milestones as you progress through your boxing journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
                1️⃣
              </div>
              <h3 className="text-2xl font-bold mb-3">Choose Your Technique</h3>
              <p className="text-gray-400">
                Select from 12+ boxing techniques including jabs, hooks, kicks, and combos.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
                2️⃣
              </div>
              <h3 className="text-2xl font-bold mb-3">Start Training</h3>
              <p className="text-gray-400">
                Our AI analyzes your movements in real-time using your camera.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
                3️⃣
              </div>
              <h3 className="text-2xl font-bold mb-3">Track Progress</h3>
              <p className="text-gray-400">
                Review your performance metrics and watch yourself improve over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-red-500/20 to-pink-600/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Training?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Join thousands of boxers improving their skills with AI-powered coaching.
          </p>
          <a
            href="/register"
            className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-10 py-5 rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-2xl"
          >
            Start Your Free Trial
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">
                  🥊
                </div>
                <span className="text-xl font-bold">BlazePose</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered boxing coach for everyone.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400 text-sm">
            © 2025 BlazePose Coach. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}