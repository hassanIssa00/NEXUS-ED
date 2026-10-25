import { uploadService } from './upload.service'

jest.mock('../api/endpoints', () => ({
  getApiUrl: (path: string) => `https://api.example.test${path}`,
  getStoredAccessToken: () => 'teacher-access-token',
}))

describe('teacher profile image upload', () => {
  const originalCreateImageBitmap = (globalThis as any).createImageBitmap
  const originalDocument = (globalThis as any).document
  const originalXMLHttpRequest = (globalThis as any).XMLHttpRequest

  afterEach(() => {
    for (const [key, value] of [
      ['createImageBitmap', originalCreateImageBitmap],
      ['document', originalDocument],
      ['XMLHttpRequest', originalXMLHttpRequest],
    ] as const) {
      if (value === undefined) delete (globalThis as any)[key]
      else (globalThis as any)[key] = value
    }
  })

  it('sends a compressed image to the authenticated self-avatar API route', async () => {
    const bitmap = { width: 100, height: 80, close: jest.fn() }
    ;(globalThis as any).createImageBitmap = jest.fn().mockResolvedValue(bitmap)

    const context = { fillStyle: '', fillRect: jest.fn(), drawImage: jest.fn() }
    ;(globalThis as any).document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => context,
        toBlob: (callback: (blob: Blob) => void) => callback(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })),
      }),
    }

    const requests: Array<{ method: string; url: string; headers: Record<string, string>; body: FormData }> = []
    ;(globalThis as any).XMLHttpRequest = class {
      upload = { addEventListener: jest.fn() }
      status = 204
      responseText = ''
      onLoad?: () => void
      method = ''
      url = ''
      headers: Record<string, string> = {}

      addEventListener(event: string, callback: () => void) {
        if (event === 'load') this.onLoad = callback
      }
      open(method: string, url: string) { this.method = method; this.url = url }
      setRequestHeader(name: string, value: string) { this.headers[name] = value }
      send(body: FormData) {
        requests.push({ method: this.method, url: this.url, headers: this.headers, body })
        this.onLoad?.()
      }
    }

    const image = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'teacher.jpg', { type: 'image/jpeg' })
    await uploadService.uploadProfileAvatar(image)

    expect(requests).toHaveLength(1)
    expect(requests[0].method).toBe('PATCH')
    expect(requests[0].url).toBe('https://api.example.test/upload/me/avatar')
    expect(requests[0].headers.Authorization).toBe('Bearer teacher-access-token')
    expect(requests[0].body.get('file')).toBeInstanceOf(File)
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})
