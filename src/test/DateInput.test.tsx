import { render, screen, fireEvent } from '@testing-library/react'
import DateInput from '../app/tracking-database/DateInput'

describe('DateInput - showPicker onClick', () => {
  afterEach(() => {
    delete (HTMLInputElement.prototype as any).showPicker
  })

  it('harus memanggil showPicker() jika browser mendukung', () => {
    const mockShowPicker = jest.fn()
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      writable: true,
      value: mockShowPicker,
    })

    // Act
    render(<DateInput />)
    fireEvent.click(screen.getByTestId('date-input'))

    // Assert
    expect(mockShowPicker).toHaveBeenCalledTimes(1)
  })

  it('tidak boleh error jika showPicker tidak didukung browser', () => {
    // Arrange — pastikan showPicker tidak ada di prototype
    delete (HTMLInputElement.prototype as any).showPicker

    // Act & Assert — tidak boleh throw error
    render(<DateInput />)
    expect(() => {
      fireEvent.click(screen.getByTestId('date-input'))
    }).not.toThrow()
  })

  it('tidak memanggil showPicker jika tidak ada di prototype', () => {
    // Arrange
    const mockShowPicker = jest.fn()
    delete (HTMLInputElement.prototype as any).showPicker

    // Act
    render(<DateInput />)
    fireEvent.click(screen.getByTestId('date-input'))

    // Assert
    expect(mockShowPicker).not.toHaveBeenCalled()
  })
})
