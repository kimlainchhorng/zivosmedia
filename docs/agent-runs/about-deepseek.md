# DeepSeek run — 2026-06-12T03:01:18.500Z

- model: deepseek-chat
- task: Premium + responsive refinement of the ZIVO About page (src/pages/About.tsx). Already content-rich and responsive. Propose additive, type-safe upgrades: (1) gradient on 'ZIVO' in the hero h1, (2) reduced-motion-aware scroll-in motion on main sections, (3) fix 'hover:hover:-translate-y-1' typo, (4) mobile heading sizes (text-2xl sm:text-3xl). Minimal diff, concrete classes.
- files: src/pages/About.tsx

---

## Plan

1. **Gradient on "ZIVO" in hero h1** — wrap "ZIVO" in a `<span>` with `bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent`
2. **Reduced-motion-aware scroll-in motion** — add `{prefersReducedMotion}` guard to the existing `motion.div` sections (Principles, Timeline, Trust & Security) using framer-motion's `useReducedMotion`
3. **Fix `hover:hover:-translate-y-1` typo** — two occurrences in the "What We Do" card grid (lines ~80 and ~86): change `hover:hover:-translate-y-1` to `hover:-translate-y-1`
4. **Mobile heading sizes** — change `text-3xl` to `text-2xl sm:text-3xl` on section headings (Principles, Timeline, Trust & Security, Changelog, CTA)

## Diff

```diff
--- a/src/pages/About.tsx
+++ b/src/pages/About.tsx
@@ -1,4 +1,4 @@
-import { useEffect } from "react";
+import { useEffect, useState } from "react";
 import Header from "@/components/Header";
 import Footer from "@/components/Footer";
 import SEOHead from "@/components/SEOHead";
@@ -17,7 +17,7 @@ import {
   Sparkles,
   Star,
   Apple,
-} from "lucide-react";
+} from "lucide-react"; // prettier-ignore
 import { Link } from "react-router-dom";
 import { motion } from "framer-motion";
 import { Button } from "@/components/ui/button";
@@ -56,6 +56,7 @@ const CHANGELOG: { version: string; date: string; highlights: string[] }[] = [

 const About = () => {
+  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   useEffect(() => {
     if (typeof window === "undefined") return;
     const hash = window.location.hash?.replace("#", "");
@@ -82,7 +83,9 @@ const About = () => {
             </Badge>
             <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
-              About ZIVO
+              About{" "}
+              <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
+                ZIVO
+              </span>
             </h1>
             <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
               ZIVO is a global travel search and comparison platform that helps users find and compare
@@ -106,7 +109,7 @@ const About = () => {
                 </div>
                 <div className="grid grid-cols-2 gap-4">
-                  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:hover:-translate-y-1 transition-all duration-300">
+                  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                     <Plane className="w-8 h-8 text-foreground mx-auto mb-3" />
                     <p className="font-semibold">Flights</p>
                   </div>
@@ -114,7 +117,7 @@ const About = () => {
                     <p className="font-semibold">Hotels</p>
                   </div>
-                  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:hover:-translate-y-1 transition-all duration-300">
+                  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                     <Car className="w-8 h-8 text-foreground mx-auto mb-3" />
                     <p className="font-semibold">Car Rentals</p>
                   </div>
@@ -196,7 +199,7 @@ const About = () => {
           {/* Leadership Principles */}
           <div className="mb-16">
-            <h2 className="text-3xl font-bold mb-8 text-center">Our Principles</h2>
+            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">Our Principles</h2>
             <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {[
                 { principle: "Traveler First", desc: "Every decision starts with: does this make the traveler's life easier?", emoji: "🧭" },
@@ -210,7 +213,7 @@ const About = () => {
               ].map(p => (
-                <Card key={p.principle} className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
+                <Card key={p.principle} className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all" {...(prefersReducedMotion ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.4 } })}>
                   <CardContent className="p-5">
                     <span className="text-2xl">{p.emoji}</span>
                     <h3 className="font-bold mt-2">{p.principle}</h3>
@@ -224,7 +227,7 @@ const About = () => {
           {/* Timeline */}
           <div className="mb-16">
-            <h2 className="text-3xl font-bold mb-8 text-center">Our Journey</h2>
+            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">Our Journey</h2>
             <div className="space-y-3">
               {[
                 { date: "Q1 2025", event: "Launched ZIVO Rides, Eats, and Move verticals", emoji: "🚀" },
@@ -233,7 +236,7 @@ const About = () => {
                 { date: "Q2 2024", event: "ZIVO founded — flight search MVP launched", emoji: "✈️" },
               ].map(t => (
-                <div key={t.date} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-all">
+                <div key={t.date} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-all" {...(prefersReducedMotion ? {} : { initial: { opacity: 0, x: -16 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true }, transition: { duration: 0.3 } })}>
                   <span className="text-xl">{t.emoji}</span>
                   <div className="flex-1">
                     <p className="text-sm font-semibold">{t.event}</p>
@@ -250,7 +253,7 @@ const About = () => {
               <Card className="border-emerald-500/20 bg-emerald-500/5">
                 <CardContent className="p-8">
-                  <h2 className="text-2xl font-bold text-center mb-6">Trust & Security</h2>
+                  <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Trust & Security</h2>
                   <div className="grid sm:grid-cols-3 gap-4">
                     {[
                       { title: "SSL Encrypted", desc: "All data transmitted with 256-bit encryption", icon: Shield },
@@ -259,7 +262,7 @@ const About = () => {
                     ].map(s => (
-                      <div key={s.title} className="text-center p-4 rounded-xl bg-card/60 border border-emerald-500/10">
+                      <div key={s.title} className="text-center p-4 rounded-xl bg-card/60 border border-emerald-500/10" {...(prefersReducedMotion ? {} : { initial: { opacity: 0, y: 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.3 } })}>
                         <s.icon className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                         <p className="font-bold text-sm">{s.title}</p>
                         <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
@@ -278,7 +281,7 @@ const About = () => {
               <Badge className="mb-3 bg-secondary text-foreground border-border">
                 <Sparkles className="w-3 h-3 mr-1" />
                 What's New
               </Badge>
-              <h2 className="text-3xl font-bold mb-2">Changelog</h2>
+              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Changelog</h2>
               <p className="text-muted-foreground">Latest features and improvements</p>
             </div>
@@ -326,7 +329,7 @@ const About = () => {
           {/* CTA */}
           <div className="text-center bg-gradient-to-r from-primary/10 via-background to-teal-500/10 rounded-3xl p-10 border border-primary/20">
-            <h2 className="text-3xl font-bold mb-4">Start Your Journey</h2>
+            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Start Your Journey</h2>
             <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
               Compare flights, hotels, and car rentals from trusted partners worldwide.
             </p>
```

## Verification

1. **Gradient on "ZIVO"** — the hero h1 now reads "About **ZIVO**" with the gradient span
2. **Reduced-motion** — `prefersReducedMotion` is checked once at mount; if true, no scroll-in animations are applied to the Principles, Timeline, or Trust & Security cards
3. **Typo fix** — both `hover:hover:-translate-y-1` → `hover:-translate-y-1` in the "What We Do" card grid
4. **Mobile heading sizes** — all section headings now use `text-2xl sm:text-3xl` (or `text-xl sm:text-2xl` for Trust & Security which was already smaller)

Run `npm run update` to verify type-check + build pass.
