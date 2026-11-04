import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommandPalette } from '../components/CommandPalette';
import { AppItem } from '../types';

const mockApps: AppItem[] = [
    { id: 'app-1', name: 'Sonarr', url: 'http://sonarr.test', iconType: 'icon', icon: 'tv', categoryId: 'cat-1' },
    { id: 'app-2', name: 'Radarr', url: 'http://radarr.test', iconType: 'icon', icon: 'film', categoryId: 'cat-1' },
    { id: 'app-3', name: 'Tautulli', url: 'http://tautulli.test', iconType: 'icon', icon: 'activity', categoryId: 'cat-1' }
];

describe('CommandPalette (Phase 1.9)', () => {
    it('filters applications based on query', async () => {
        render(<CommandPalette open={true} onOpenChange={() => { }} apps={mockApps} />);

        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'Rad' } });

        expect(screen.getByText('Radarr')).toBeInTheDocument();
        expect(screen.queryByText('Sonarr')).not.toBeInTheDocument();
    });

    it('navigates with ArrowDown and ArrowUp', async () => {
        render(<CommandPalette open={true} onOpenChange={() => { }} apps={mockApps} />);

        const input = screen.getByPlaceholderText(/search/i);

        // Initial selection should be first item (Sonarr)
        const items = screen.getAllByRole('button');
        expect(items[0]).toHaveClass('bg-primary/10'); // Index 0 is selected

        // Press Down
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(items[1]).toHaveClass('bg-primary/10'); // Index 1 is selected

        // Press Up
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        expect(items[0]).toHaveClass('bg-primary/10'); // Back to index 0
    });

    it('unifies icon fallback (Initials logic)', () => {
        render(<CommandPalette open={true} onOpenChange={() => { }} apps={mockApps} />);

        // "Sonarr" -> "S", "Radarr" -> "R"
        // Wait, our getInitials logic for "Sonarr" would be "S" (single word)
        // Let's check "Tautulli"
        expect(screen.getByText('S')).toBeInTheDocument();
        expect(screen.getByText('R')).toBeInTheDocument();
        expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('launches application on Enter', () => {
        const spy = vi.spyOn(window, 'open').mockImplementation(() => null);
        render(<CommandPalette open={true} onOpenChange={() => { }} apps={mockApps} />);

        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(spy).toHaveBeenCalledWith('http://sonarr.test', '_blank');
        spy.mockRestore();
    });
});
