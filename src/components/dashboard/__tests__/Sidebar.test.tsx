import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sidebar } from '../Sidebar';

describe('Sidebar photo consent administration link', () => {
  it('shows the link to a delegated photo consent administrator', () => {
    render(
      <Sidebar
        userRole="parent"
        isParent
        isVolunteerAdmin={false}
        isPhotoConsentAdmin
      />
    );

    expect(
      screen.getByRole('link', { name: 'Photo Consents' })
    ).toHaveAttribute('href', '/admin/photo-consents');
  });

  it('hides the link from a user without access', () => {
    render(
      <Sidebar
        userRole="parent"
        isParent
        isVolunteerAdmin={false}
        isPhotoConsentAdmin={false}
      />
    );

    expect(
      screen.queryByRole('link', { name: 'Photo Consents' })
    ).not.toBeInTheDocument();
  });
});
