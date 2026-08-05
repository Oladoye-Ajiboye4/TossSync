import React, { useState, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import api from '../../../api/axios'

/**
 * BulkUploadModal — Admin uploads CSV with resident data (username, email).
 * Parses CSV client-side using FileReader + array methods (no for loops).
 * Sends parsed array to POST /api/organization/residents/bulk.
 */
const BulkUploadModal = ({ open, onClose, onSuccess, notify, errorNotify }) => {
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)
  const resultRef = useRef(null)

  // Animate result summary when it appears
  useGSAP(() => {
    if (result && resultRef.current) {
      gsap.fromTo(
        resultRef.current,
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      )
    }
  }, [result])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile)
      setResult(null)
    } else {
      errorNotify?.('Please select a valid CSV file')
      setFile(null)
    }
  }

  const parseCSV = (text) => {
    // Split into lines, filter out empty lines
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row')
    }

    // Parse header (first line)
    const headers = lines[0]
      .split(',')
      .map(h => h.trim().toLowerCase())

    const usernameIndex = headers.indexOf('username')
    const emailIndex = headers.indexOf('email')

    if (usernameIndex === -1 || emailIndex === -1) {
      throw new Error('CSV must have "username" and "email" columns')
    }

    // Parse data rows (skip header) using array methods only
    const residents = lines
      .slice(1) // skip header
      .map(line => {
        const values = line.split(',').map(v => v.trim())
        return {
          username: values[usernameIndex] || '',
          email: values[emailIndex] || ''
        }
      })
      .filter(resident => resident.username && resident.email) // only keep valid rows

    return residents
  }

  const handleUpload = async () => {
    if (!file) {
      errorNotify?.('Please select a CSV file first')
      return
    }

    setParsing(true)
    setResult(null)

    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const residents = parseCSV(text)

        if (residents.length === 0) {
          errorNotify?.('No valid resident data found in CSV')
          setParsing(false)
          return
        }

        setParsing(false)
        setUploading(true)

        const { data } = await api.post('/organization/residents/bulk', { residents })

        setResult({
          created: data.created || [],
          skipped: data.skipped || []
        })

        notify?.(data.message || `Bulk upload complete: ${data.created?.length || 0} created`)
        onSuccess?.()
      } catch (error) {
        setParsing(false)
        setUploading(false)
        if (error.message) {
          errorNotify?.(error.message)
        } else {
          errorNotify?.(error?.response?.data?.message || 'Failed to upload residents')
        }
      } finally {
        setUploading(false)
      }
    }

    reader.onerror = () => {
      setParsing(false)
      errorNotify?.('Failed to read the file')
    }

    reader.readAsText(file)
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    handleReset()
    onClose?.()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Upload Residents" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Instructions */}
        <div className="rounded-xl bg-primary/20 border border-primary/50 p-4">
          <div className="flex items-start gap-3">
            <Icon icon="mdi:information-outline" width="20" height="20" className="text-secondary shrink-0 mt-0.5" />
            <div className="text-sm text-[#5b4a3a]">
              <p className="font-semibold mb-2">CSV Format Requirements:</p>
              <ul className="space-y-1 text-xs">
                <li>• First row must be headers: <code className="bg-background px-1 rounded">username,email</code></li>
                <li>• Each subsequent row is one resident</li>
                <li>• Registration codes and passwords will be auto-generated</li>
                <li>• Each resident will receive their code via email</li>
              </ul>
              <div className="mt-3 p-2 bg-background rounded text-xs font-mono">
                <div className="text-secondary font-semibold">Example CSV:</div>
                <div className="mt-1">username,email</div>
                <div>John Doe,john@example.com</div>
                <div>Jane Smith,jane@example.com</div>
              </div>
            </div>
          </div>
        </div>

        {/* File input */}
        <div>
          <label className="block text-sm font-semibold text-secondary mb-2">Select CSV File</label>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="flex-1 p-3 rounded-xl border border-tertiary/50 bg-white/80 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-secondary file:text-white file:font-semibold hover:file:bg-secondary/90"
            />
            {file && (
              <Button type="button" variant="outline" onClick={handleReset}>
                <Icon icon="mdi:close" width="18" height="18" />
              </Button>
            )}
          </div>
          {file && (
            <p className="text-xs text-[#5b4a3a]/70 mt-2">
              <Icon icon="mdi:file-check" width="14" height="14" className="inline mr-1" />
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Result summary */}
        {result && (
          <div ref={resultRef} className="rounded-xl border border-tertiary/40 overflow-hidden">
            <div className="bg-primary/20 px-4 py-3 border-b border-tertiary/40">
              <h4 className="font-bold text-secondary flex items-center gap-2">
                <Icon icon="mdi:chart-box" width="20" height="20" />
                Upload Summary
              </h4>
            </div>
            <div className="p-4 space-y-4">
              {/* Created */}
              <div>
                <p className="text-sm font-semibold text-secondary mb-2">
                  ✓ Successfully Created ({result.created.length})
                </p>
                {result.created.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-background/50 p-2">
                    <div className="space-y-1 text-xs">
                      {result.created.map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded">
                          <span className="font-semibold text-secondary">{r.username}</span>
                          <span className="text-[#5b4a3a]/70">{r.email}</span>
                          <code className="text-xs bg-primary/20 px-2 py-0.5 rounded text-secondary">
                            {r.registration_code}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#5b4a3a]/70">None</p>
                )}
              </div>

              {/* Skipped */}
              <div>
                <p className="text-sm font-semibold text-secondary mb-2">
                  ⚠ Skipped ({result.skipped.length})
                </p>
                {result.skipped.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-background/50 p-2">
                    <div className="space-y-1 text-xs">
                      {result.skipped.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 p-1.5 bg-white rounded">
                          <Icon icon="mdi:alert-circle-outline" width="16" height="16" className="text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-[#5b4a3a]">
                              {s.row?.username || 'Unknown'} ({s.row?.email || 'no email'})
                            </p>
                            <p className="text-red-600 text-xs">{s.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#5b4a3a]/70">None</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              disabled={!file || parsing || uploading}
              className="flex-1"
            >
              <Icon icon="mdi:upload" width="20" height="20" />
              {parsing ? 'Parsing...' : uploading ? 'Uploading...' : 'Upload & Create'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default BulkUploadModal
