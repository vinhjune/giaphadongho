import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExportImportToolbar from '../ExportImportToolbar'
import * as csvClient from '../../../utils/csv-client'

vi.mock('../../../utils/csv-client')

const mockImportResult = { imported: { persons: 10, families: 4 } }

describe('ExportImportToolbar — Export', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Export CSV button', () => {
    render(<ExportImportToolbar token="test-token" />)
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
  })

  it('calls downloadCsv on click', async () => {
    const mockDownload = vi.spyOn(csvClient, 'downloadCsv').mockResolvedValue(undefined)
    render(<ExportImportToolbar token="test-token" />)
    await userEvent.click(screen.getByRole('button', { name: /export csv/i }))
    expect(mockDownload).toHaveBeenCalledOnce()
  })

  it('shows loading state while downloading', async () => {
    vi.spyOn(csvClient, 'downloadCsv').mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
    render(<ExportImportToolbar token="test-token" />)
    await userEvent.click(screen.getByRole('button', { name: /export csv/i }))
    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled()
  })

  it('shows error message when downloadCsv throws', async () => {
    vi.spyOn(csvClient, 'downloadCsv').mockRejectedValue(new Error('Server error'))
    render(<ExportImportToolbar token="test-token" />)
    await userEvent.click(screen.getByRole('button', { name: /export csv/i }))
    await waitFor(() => {
      expect(screen.getByText(/export thất bại/i)).toBeInTheDocument()
    })
  })
})

describe('ExportImportToolbar — Import', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Import CSV button', () => {
    render(<ExportImportToolbar token="test-token" />)
    expect(screen.getByRole('button', { name: /import csv/i })).toBeInTheDocument()
  })

  it('calls uploadCsvZip with selected file', async () => {
    const mockUpload = vi.spyOn(csvClient, 'uploadCsvZip').mockResolvedValue(mockImportResult)
    render(<ExportImportToolbar token="test-token" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake zip'], 'test.zip', { type: 'application/zip' })
    await userEvent.upload(input, file)
    expect(mockUpload).toHaveBeenCalledWith(file, 'test-token')
  })

  it('shows uploading state while uploading', async () => {
    vi.spyOn(csvClient, 'uploadCsvZip').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockImportResult), 100))
    )
    render(<ExportImportToolbar token="test-token" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake'], 'test.zip', { type: 'application/zip' })
    await userEvent.upload(input, file)
    expect(screen.getByRole('button', { name: /import csv/i })).toBeDisabled()
  })

  it('shows success message with imported counts', async () => {
    vi.spyOn(csvClient, 'uploadCsvZip').mockResolvedValue(mockImportResult)
    render(<ExportImportToolbar token="test-token" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File([''], 'test.zip'))
    await waitFor(() => {
      expect(screen.getByText(/10.*thành viên/i)).toBeInTheDocument()
    })
  })

  it('shows error messages on 400 response', async () => {
    vi.spyOn(csvClient, 'uploadCsvZip').mockRejectedValue(
      Object.assign(new Error('Validation failed'), {
        errors: ['Row 2: invalid gender "INVALID"'],
      })
    )
    render(<ExportImportToolbar token="test-token" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File([''], 'test.zip'))
    await waitFor(() => {
      expect(screen.getByText(/invalid gender/i)).toBeInTheDocument()
    })
  })

  it('calls onImportSuccess callback after successful import', async () => {
    vi.spyOn(csvClient, 'uploadCsvZip').mockResolvedValue(mockImportResult)
    const onSuccess = vi.fn()
    render(<ExportImportToolbar token="test-token" onImportSuccess={onSuccess} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File([''], 'test.zip'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
  })
})
