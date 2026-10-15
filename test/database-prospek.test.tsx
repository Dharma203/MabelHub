/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// ─── 1. MOCK DEPENDENCIES ──────────────────────────────────────────────────

jest.mock('@/components/session/SessionProvider', () => ({
  useSession: () => ({
    user: { _id: 'u1', name: 'Test', role: 'ADMIN' },
    loading: false,
  }),
}))

jest.mock('@/components/ui/Card', () => {
  return function MockCard() {
    return (
      <div data-testid="card-component">
        <a href="/database-tracking">Database B2G</a>
        <a href="/database-tracking">Database B2B</a>
      </div>
    )
  }
})

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }: any) {
    return <a href={href} {...rest}>{children}</a>
  }
})

import DatabaseProspekPage from '@/app/database-prospek/page'

// ─── 2. TESTS ───────────────────────────────────────────────────────────────

describe('DatabaseProspekPage', () => {
  it('renders the page title "Database Prospek"', () => {
    render(<DatabaseProspekPage />)

    expect(screen.getByText('Database Prospek')).toBeInTheDocument()
  })

  it('renders the subtitle "Silahkan Pilih Database"', () => {
    render(<DatabaseProspekPage />)

    expect(screen.getByText(/Silahkan Pilih Database/i)).toBeInTheDocument()
  })

  it('renders the Card component', () => {
    render(<DatabaseProspekPage />)

    expect(screen.getByTestId('card-component')).toBeInTheDocument()
  })

  it('has correct page background class', () => {
    const { container } = render(<DatabaseProspekPage />)

    const rootDiv = container.firstChild as HTMLElement
    expect(rootDiv.className).toContain('bg-blue-50')
    expect(rootDiv.className).toContain('min-h-screen')
  })

  it('renders heading with proper styling', () => {
    render(<DatabaseProspekPage />)

    const heading = screen.getByText('Database Prospek')
    expect(heading.tagName).toBe('H1')
    expect(heading.className).toContain('font-extrabold')
  })

  it('renders subtitle as h1 with bold styling', () => {
    render(<DatabaseProspekPage />)

    const subtitle = screen.getByText(/Silahkan Pilih Database/i)
    expect(subtitle.tagName).toBe('H1')
    expect(subtitle.className).toContain('font-extrabold')
  })

  it('wraps content in white card container', () => {
    render(<DatabaseProspekPage />)

    const heading = screen.getByText('Database Prospek')
    const card = heading.closest('.bg-white')
    expect(card).toBeTruthy()
    expect(card!.className).toContain('rounded-xl')
    expect(card!.className).toContain('shadow-md')
  })
})
