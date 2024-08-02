class AppSyncError extends Error {
  readonly data: unknown
  readonly type: string

  constructor(message: string, type = 'UnknownError', data: unknown = null) {
    super(message)
    this.data = data
    this.type = type
  }
}

export { AppSyncError }
