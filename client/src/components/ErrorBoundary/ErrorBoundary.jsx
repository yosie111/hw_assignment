// client/src/components/ErrorBoundary/ErrorBoundary.jsx
//
// Safety net for unhandled React render errors.
// Wraps the entire app in App.js.

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px', textAlign: 'center', maxWidth: '600px', margin: '60px auto',
          background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginBottom: '12px' }}>Something went wrong</h2>
          <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', background: '#e74c3c', color: 'white',
              border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
