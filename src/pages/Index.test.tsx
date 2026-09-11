import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Index from './Index';
const auth = vi.hoisted(() => ({user: null as null | {id:string}, isLoading:false}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => auth}));
vi.mock('@capacitor/core', () => ({Capacitor:{isNativePlatform: () => false}}));
vi.mock('./CambodiaHome', () => ({default: () => <h1>Public Cambodia home</h1>}));
afterEach(() => {cleanup(); auth.user=null; auth.isLoading=false;});
function mount() { return render(<MemoryRouter><Routes><Route path="/" element={<Index />} /><Route path="/feed" element={<h1>Your feed</h1>} /></Routes></MemoryRouter>); }
it('shows the public homepage for signed-out browsers', () => {mount();expect(screen.getByRole('heading')).toHaveTextContent('Public Cambodia home');});
it('sends signed-in web users to feed', () => {auth.user={id:'example'};mount();expect(screen.getByRole('heading')).toHaveTextContent('Your feed');});
it('waits for auth resolution before selecting a destination', () => {auth.isLoading=true;mount();expect(screen.getByRole('status')).toHaveTextContent('Opening your home');expect(screen.queryByRole('heading')).toBeNull();});
