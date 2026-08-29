import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PhotoConsentRosterMember } from '@/lib/actions/admin';
import { PhotoConsentTable } from '../PhotoConsentTable';

const rows: PhotoConsentRosterMember[] = [
  {
    id: 'student-zed',
    studentName: 'Zed Student',
    grade: 'middle school',
    photoConsent: true,
    parentName: 'Alpha Parent',
    parentEmail: 'zed-family@example.com',
  },
  {
    id: 'student-amy',
    studentName: 'Amy Student',
    grade: 'elementary',
    photoConsent: false,
    parentName: 'Zulu Parent',
    parentEmail: 'amy-family@example.com',
  },
  {
    id: 'student-moe',
    studentName: 'Moe Student',
    grade: 'high school',
    photoConsent: true,
    parentName: 'Middle Parent',
    parentEmail: 'moe-family@example.com',
  },
];

function firstStudentName() {
  const firstRow = screen.getAllByTestId('photo-consent-row')[0];
  return within(firstRow).getAllByRole('cell')[0].textContent;
}

describe('PhotoConsentTable sorting', () => {
  it('sorts by student name ascending by default and descending on click', async () => {
    const user = userEvent.setup();
    render(<PhotoConsentTable rows={rows} />);

    expect(firstStudentName()).toBe('Amy Student');

    await user.click(
      screen.getByRole('button', { name: /Sort by Student descending/ })
    );

    expect(firstStudentName()).toBe('Zed Student');
  });

  it.each([
    ['Grade', 'Amy Student'],
    ['Parent or Guardian', 'Zed Student'],
    ['Email', 'Amy Student'],
    ['Photo Consent', 'Amy Student'],
  ])('sorts by %s when its header is clicked', async (label, expectedFirst) => {
    const user = userEvent.setup();
    render(<PhotoConsentTable rows={rows} />);

    await user.click(
      screen.getByRole('button', {
        name: new RegExp(`Sort by ${label} ascending`),
      })
    );

    expect(firstStudentName()).toBe(expectedFirst);
  });

  it('toggles the active column from ascending to descending', async () => {
    const user = userEvent.setup();
    render(<PhotoConsentTable rows={rows} />);
    const emailSort = screen.getByRole('button', {
      name: /Sort by Email ascending/,
    });

    await user.click(emailSort);
    expect(firstStudentName()).toBe('Amy Student');

    await user.click(
      screen.getByRole('button', { name: /Sort by Email descending/ })
    );
    expect(firstStudentName()).toBe('Zed Student');
  });
});
