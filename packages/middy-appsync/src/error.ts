class AppSyncError extends Error {
  readonly type: string

  constructor(message: string, type = 'UnknownError') {
    super(message)
    this.type = type
  }
}

export { AppSyncError }
