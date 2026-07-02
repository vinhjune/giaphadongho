import { Component, type ReactNode, type ErrorInfo } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="text-center max-w-sm px-4">
            <h1 className="text-2xl font-bold text-stone-800 mb-2">Có lỗi xảy ra</h1>
            <p className="text-stone-500 text-sm mb-6">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
