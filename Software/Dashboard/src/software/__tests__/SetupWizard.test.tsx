import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SetupWizard } from '../components/SetupWizard';

const mockOnComplete = vi.fn();
const mockOnSkip = vi.fn();
const mockCategories = [{ id: '1', name: 'General', icon: 'Box', order: 0 }];

describe('SetupWizard', () => {
    it('renders the welcome step initially', () => {
        render(<SetupWizard onComplete={mockOnComplete} onSkip={mockOnSkip} categories={mockCategories} />);
        expect(screen.getByText('Welcome to BrayDashy')).toBeInTheDocument();
        expect(screen.getByText('Get Started')).toBeInTheDocument();
    });

    it('transitions to Identity step on "Get Started" click', async () => {
        render(<SetupWizard onComplete={mockOnComplete} onSkip={mockOnSkip} categories={mockCategories} />);
        fireEvent.click(screen.getByText('Get Started'));
        expect(await screen.findByText('Identity')).toBeInTheDocument();
        expect(await screen.findByPlaceholderText('My Cloud Home')).toBeInTheDocument();
    });

    it('updates setup data on input change', async () => {
        render(<SetupWizard onComplete={mockOnComplete} onSkip={mockOnSkip} categories={mockCategories} />);
        fireEvent.click(screen.getByText('Get Started'));
        const input = await screen.findByPlaceholderText('My Cloud Home');
        fireEvent.change(input, { target: { value: 'Custom Server' } });
        expect(input).toHaveValue('Custom Server');
    });

    it('calls onSkip when "Skip setup" is clicked', () => {
        render(<SetupWizard onComplete={mockOnComplete} onSkip={mockOnSkip} categories={mockCategories} />);
        fireEvent.click(screen.getByText('Skip setup & use defaults'));
        expect(mockOnSkip).toHaveBeenCalled();
    });
});
