import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';

// Mock the fetch call to return an empty config
global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({
        serverName: 'BrayDashy',
        apps: [], // EMPTY APPS = First Run
        categories: [{ id: 'cat1', name: 'Default', order: 0 }],
        glanceWidgets: [],
        themeColor: 'blue',
        backgroundStyle: 'mesh'
    })
});

// Mock Framer Motion to avoid animation issues in jsdom
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('First-Run Detection (Shadow Test)', () => {
    it('should render the Setup Wizard when no apps are configured and setup not complete', async () => {
        render(<App />);

        // Wait for the async config load
        const welcomeText = await screen.findByText(/Welcome to BrayDashy/i);
        expect(welcomeText).toBeDefined();

        // Check for Skip button
        const skipButton = screen.getByText(/Skip setup/i);
        expect(skipButton).toBeDefined();
    });
});
