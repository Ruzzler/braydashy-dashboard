import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppCard } from '../components/AppCard';

// Mock the global fetch
global.fetch = vi.fn();

const mockApp = {
    id: 'test-app',
    name: 'Test App',
    url: 'https://test.com',
    icon: 'Box',
    iconType: 'icon' as const,
    categoryId: 'cat-1'
};

describe('AppCard', () => {
    it('renders the app name correctly', () => {
        render(<AppCard app={mockApp} />);
        expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    it('shows "Checking..." status initially', () => {
        render(<AppCard app={mockApp} />);
        expect(screen.getByText('Checking...')).toBeInTheDocument();
    });
});
