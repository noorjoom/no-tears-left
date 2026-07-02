import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RosterGrid } from './RosterGrid';

const baseMember = {
  id: '1',
  epicUsername: 'aliceEpic',
  platform: 'PC' as const,
  timezone: 'UTC',
  discordUsername: 'alice',
  discordAvatar: null,
};

describe('RosterGrid', () => {
  it('renders a TikTok link when tiktokUrl is set', () => {
    render(
      <RosterGrid
        members={[{ ...baseMember, tiktokUrl: 'https://www.tiktok.com/@alice' }]}
      />,
    );
    const link = screen.getByRole('link', { name: 'TikTok' });
    expect(link).toHaveAttribute('href', 'https://www.tiktok.com/@alice');
  });

  it('omits the TikTok link when tiktokUrl is null', () => {
    render(<RosterGrid members={[{ ...baseMember, tiktokUrl: null }]} />);
    expect(screen.queryByRole('link', { name: 'TikTok' })).not.toBeInTheDocument();
  });

  it('renders an empty-state message when there are no members', () => {
    render(<RosterGrid members={[]} />);
    expect(screen.getByText('No approved roster members yet.')).toBeInTheDocument();
  });
});
