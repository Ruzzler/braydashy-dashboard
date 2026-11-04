import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsModal } from '../components/SettingsModal';
import { ConfigProvider } from '../context/ConfigContext';

// We mock the fetch for the ConfigProvider
global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
        json: () => Promise.resolve({
            serverName: 'Test Server',
            categories: [{ id: 'cat-1', name: 'General', order: 0 }],
            apps: [],
            themeColor: 'emerald',
            backgroundStyle: 'orbs'
        }),
        ok: true
    })
);

describe('SettingsModal Dual-Mode (Home Mode & Sysadmin Mode)', () => {
    it('renders the settings modal with Home Mode and Sysadmin Mode switcher', async () => {
        render(
            <ConfigProvider>
                <SettingsModal />
            </ConfigProvider>
        );

        // Trigger open
        const trigger = screen.getByRole('button');
        fireEvent.click(trigger);

        expect(screen.getByText(/Home Mode/i)).toBeInTheDocument();
        expect(screen.getByText(/Sysadmin Mode/i)).toBeInTheDocument();
    });

    it('contains the Save Changes action', async () => {
        render(
            <ConfigProvider>
                <SettingsModal />
            </ConfigProvider>
        );
        fireEvent.click(screen.getByRole('button'));

        const saveButton = screen.getByText(/Save Changes/i);
        expect(saveButton).toBeInTheDocument();
    });
});
