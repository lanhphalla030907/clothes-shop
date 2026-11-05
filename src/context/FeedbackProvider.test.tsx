import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FeedbackProvider } from './FeedbackProvider'
import { useFeedback } from './feedbackContext'

function FeedbackDriver() {
  const { showFeedback, confirmFeedback } = useFeedback()
  const [confirmationResult, setConfirmationResult] = useState<string>()
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          showFeedback({
            type: 'success',
            title: 'Saved',
            message: 'Your custom message.',
          })
        }
      >
        Show success
      </button>
      <button
        type="button"
        onClick={() => {
          const message = { type: 'success' as const, title: 'Repeated', message: 'Once only.' }
          showFeedback(message)
          showFeedback(message)
        }}
      >
        Show duplicate
      </button>
      <button
        type="button"
        onClick={() =>
          showFeedback({ type: 'error', title: 'Failed', message: 'Try again.' })
        }
      >
        Show error
      </button>
      <button
        type="button"
        onClick={() =>
          showFeedback({ type: 'warning', title: 'Heads up', message: 'Check this first.' })
        }
      >
        Show warning
      </button>
      <button
        type="button"
        onClick={() =>
          showFeedback({ type: 'info', title: 'Information', message: 'Useful detail.' })
        }
      >
        Show information
      </button>
      <button
        type="button"
        onClick={() => {
          void confirmFeedback({
            type: 'warning',
            title: 'Confirm removal',
            message: 'This action cannot be undone.',
            confirmLabel: 'Remove',
            cancelLabel: 'Keep',
          }).then((confirmed) => setConfirmationResult(confirmed ? 'Confirmed' : 'Cancelled'))
        }}
      >
        Ask confirmation
      </button>
      {confirmationResult && <p>{confirmationResult}</p>}
    </div>
  )
}

const renderFeedback = () =>
  render(
    <FeedbackProvider>
      <FeedbackDriver />
    </FeedbackProvider>,
  )

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

afterEach(cleanup)

describe('global feedback dialog', () => {
  it.each([
    ['Show success', 'Saved', 'Your custom message.', 'status', 'text-success'],
    ['Show error', 'Failed', 'Try again.', 'alert', 'text-signal'],
    ['Show warning', 'Heads up', 'Check this first.', 'alert', 'text-warning'],
    ['Show information', 'Information', 'Useful detail.', 'status', 'text-info'],
  ] as const)('shows the %s variant with semantic styling and message', (button, title, message, role, color) => {
    renderFeedback()
    fireEvent.click(screen.getByRole('button', { name: button }))
    const dialog = screen.getByRole('dialog', { name: title })
    expect(dialog).toBeTruthy()
    expect(screen.getByRole(role).textContent).toContain(message)
    expect(dialog.querySelector(`.${color}`)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Okay' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('uses custom titles and messages and supports Escape when dismissal is safe', () => {
    renderFeedback()
    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))
    const dialog = screen.getByRole('dialog', { name: 'Saved' })
    expect(screen.getByText('Your custom message.')).toBeTruthy()

    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('requires an explicit choice for confirmation and resolves confirm/cancel', async () => {
    renderFeedback()
    fireEvent.click(screen.getByRole('button', { name: 'Ask confirmation' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm removal' })
    expect(screen.getByText('This action cannot be undone.')).toBeTruthy()
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
    expect(screen.getByRole('dialog', { name: 'Confirm removal' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(await screen.findByText('Cancelled')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ask confirmation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByText('Confirmed')).toBeTruthy()
  })

  it('does not open overlapping dialogs when multiple feedback requests are queued', () => {
    renderFeedback()
    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show error' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Okay' }))
    expect(screen.getByRole('dialog', { name: 'Failed' })).toBeTruthy()
  })

  it('deduplicates an identical feedback request', () => {
    renderFeedback()
    fireEvent.click(screen.getByRole('button', { name: 'Show duplicate' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Okay' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
