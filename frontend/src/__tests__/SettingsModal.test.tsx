import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsModal } from '../components/SettingsModal';
import { Config } from '../types';

const mockConfig: Config = {
    serverName: 'Test Server',
    categories: [{ id: 'cat-1', name: 'General', order: 0 }],
    apps: [
        { id: 'app-1', name: 'App One', url: 'http://app1.test', iconType: 'icon', icon: 'server', categoryId: 'cat-1' }
    ],
    themeColor: 'emerald',
    backgroundStyle: 'orbs'
};

describe('SettingsModal Retrospective (Phase 1.9)', () => {
    it('renders the version tag v0.8.7', async () => {
        render(<SettingsModal config={mockConfig} onSave={() => { }} />);

        // Trigger open
        const trigger = screen.getByRole('button');
        fireEvent.click(trigger);

        expect(screen.getByText('v0.8.7')).toBeInTheDocument();
    });

    it('triggers onPreviewConfig when local changes are made (Live Preview)', async () => {
        const onPreviewConfig = vi.fn();
        render(<SettingsModal config={mockConfig} onSave={() => { }} onPreviewConfig={onPreviewConfig} />);

        // Open modal
        fireEvent.click(screen.getByRole('button'));

        // Find input for server name
        const input = screen.getByLabelText(/Server Name/i);
        fireEvent.change(input, { target: { value: 'New Server Name' } });

        // Verify preview was called with the new name
        expect(onPreviewConfig).toHaveBeenCalled();
        const lastCall = onPreviewConfig.mock.calls[onPreviewConfig.mock.calls.length - 1][0];
        expect(lastCall.serverName).toBe('New Server Name');
    });

    it('contains the "Save Changes" sticky footer action', async () => {
        render(<SettingsModal config={mockConfig} onSave={() => { }} />);
        fireEvent.click(screen.getByRole('button'));

        // The sticky footer is identified by the Save button usually
        const saveButton = screen.getByText(/Save Changes/i);
        expect(saveButton).toBeInTheDocument();
        // Look for the sticky container, which might be a grandparent
        const stickyContainer = saveButton.closest('.sticky');
        expect(stickyContainer).toBeInTheDocument();
        expect(stickyContainer).toHaveClass('sticky');
    });
});
