import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import ResetPassword from './ResetPassword'

const { submitPasswordResetMock } = vi.hoisted(() => ({
  submitPasswordResetMock: vi.fn(),
}))

vi.mock('@/features/auth/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth/api')>()
  return { ...actual, submitPasswordReset: submitPasswordResetMock }
})

const TOKEN = 'A'.repeat(43)

const renderPage = (token?: string) =>
  render(
    <MemoryRouter
      initialEntries={[token === undefined ? '/reset-password' : `/reset-password?token=${token}`]}
    >
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>,
  )

const fillPasswords = (password: string, confirmPassword = password) => {
  fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: password } })
  fireEvent.change(screen.getByLabelText(/^Confirm new password/), {
    target: { value: confirmPassword },
  })
}

beforeEach(() => {
  submitPasswordResetMock.mockReset()
})

afterEach(cleanup)

describe('ResetPassword', () => {
  it('shows the invalid-link state when the token is missing', () => {
    renderPage()

    expect(screen.getByRole('alert').textContent).toContain('invalid or has expired')
    expect(screen.queryByLabelText('New password')).toBeNull()
    expect(
      screen.getByRole('link', { name: /request a new link/i }).getAttribute('href'),
    ).toBe('/forgot-password')
  })

  it('validates the password locally without calling the API', async () => {
    renderPage(TOKEN)

    fillPasswords('short', 'different')
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeTruthy()
    expect(screen.getByText('Passwords do not match.')).toBeTruthy()
    expect(submitPasswordResetMock).not.toHaveBeenCalled()
  })

  it('submits the token and shows the success state', async () => {
    const message = 'Your password has been reset. You can now sign in with your new password.'
    submitPasswordResetMock.mockResolvedValue(message)
    renderPage(TOKEN)

    fillPasswords('a-new-password')
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByRole('status')).toBeTruthy()
    expect(screen.getByText(message)).toBeTruthy()
    expect(submitPasswordResetMock).toHaveBeenCalledWith({
      token: TOKEN,
      newPassword: 'a-new-password',
      confirmPassword: 'a-new-password',
    })
    expect(screen.getByRole('link', { name: /^sign in$/i }).getAttribute('href')).toBe('/login')
  })

  it('turns an expired or used token into the invalid-link state', async () => {
    submitPasswordResetMock.mockRejectedValue(
      new ApiError('This password reset link is invalid or has expired. Request a new one.', {
        kind: 'validation',
        status: 400,
      }),
    )
    renderPage(TOKEN)

    fillPasswords('a-new-password')
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect((await screen.findByRole('alert')).textContent).toContain('invalid or has expired')
    expect(screen.queryByLabelText('New password')).toBeNull()
    expect(
      screen.getByRole('link', { name: /request a new link/i }).getAttribute('href'),
    ).toBe('/forgot-password')
  })

  it('keeps the form and reports a network failure', async () => {
    submitPasswordResetMock.mockRejectedValue(
      new ApiError('The studio could not be reached.', { kind: 'network' }),
    )
    renderPage(TOKEN)

    fillPasswords('a-new-password')
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'We could not reach the studio',
    )
    expect(screen.getByLabelText(/^New password/)).toBeTruthy()
  })

  it('toggles password visibility for both fields', () => {
    renderPage(TOKEN)

    const password = screen.getByLabelText(/^New password/)
    const confirm = screen.getByLabelText(/^Confirm new password/)
    expect(password.getAttribute('type')).toBe('password')
    expect(confirm.getAttribute('type')).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Show new password' }))
    expect(password.getAttribute('type')).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: 'Show confirm password' }))
    expect(confirm.getAttribute('type')).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide new password' }))
    expect(password.getAttribute('type')).toBe('password')
  })
})
