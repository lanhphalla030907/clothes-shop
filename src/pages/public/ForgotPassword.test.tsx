import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import ForgotPassword from './ForgotPassword'

const { requestPasswordResetMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
}))

vi.mock('@/features/auth/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth/api')>()
  return { ...actual, requestPasswordReset: requestPasswordResetMock }
})

const GENERIC_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.'

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    </MemoryRouter>,
  )

const submitEmail = (value: string) => {
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
}

beforeEach(() => {
  requestPasswordResetMock.mockReset()
})

afterEach(cleanup)

describe('ForgotPassword', () => {
  it('rejects an invalid email before calling the API', async () => {
    renderPage()
    submitEmail('not-an-email')

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy()
    expect(requestPasswordResetMock).not.toHaveBeenCalled()
  })

  it('shows the generic success state and starts the resend cooldown', async () => {
    requestPasswordResetMock.mockResolvedValue(GENERIC_MESSAGE)
    renderPage()

    submitEmail('  shopper@example.com  ')

    expect(await screen.findByRole('status')).toBeTruthy()
    expect(screen.getByText(GENERIC_MESSAGE)).toBeTruthy()
    expect(requestPasswordResetMock).toHaveBeenCalledWith('shopper@example.com')

    const resend = screen.getByRole('button', { name: /resend in 60s/i })
    expect((resend as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps the success state and explains a failed resend', async () => {
    requestPasswordResetMock.mockRejectedValue(
      new ApiError('Password reset is temporarily unavailable. Please try again later.', {
        kind: 'unavailable',
        status: 503,
      }),
    )
    renderPage()

    submitEmail('shopper@example.com')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(
      'Password reset is temporarily unavailable. Please try again later.',
    )
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByLabelText(/^Email/)).toBeTruthy()
  })

  it('returns to the form when a different email is requested', async () => {
    requestPasswordResetMock.mockResolvedValue(GENERIC_MESSAGE)
    renderPage()

    submitEmail('shopper@example.com')
    await screen.findByRole('status')

    fireEvent.click(screen.getByRole('button', { name: /use a different email/i }))

    expect(screen.getByLabelText(/^Email/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeTruthy()
  })

  it('offers a visible link back to sign in', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /back to sign in/i }).getAttribute('href')).toBe(
      '/login',
    )
  })
})
