import { render, screen } from '@testing-library/react'
import LandingPage from '@/app/page'
import { expect, test } from 'vitest'

test('LandingPage renders welcome message', () => {
  render(<LandingPage />)
  expect(screen.getByText(/Welcome to the Community/i)).toBeDefined()
  expect(screen.getByText(/Get Started/i)).toBeDefined()
})
