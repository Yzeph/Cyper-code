import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import App from './App';
import './index.css';

interface MonacoWorkerEnvironment {
  getWorker: (moduleId: string, label: string) => Worker;
}

(globalThis as unknown as { MonacoEnvironment: MonacoWorkerEnvironment }).MonacoEnvironment =
  {
    getWorker(_moduleId: string, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new TsWorker();
      }
      return new EditorWorker();
    },
  };

// Bundle Monaco locally: the demo must keep working with no network.
loader.config({ monaco });

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('赛博阎王殿渲染异常', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center px-6">
          <div className="panel max-w-lg p-8 text-center">
            <h1 className="font-display text-3xl text-hell-red">
              奈何桥塌了
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-mist/70">
              页面渲染遇到异常，但你的代码没有被上传或执行。
            </p>
            <pre className="evidence mt-4 max-h-32 overflow-auto text-left">
              {this.state.message}
            </pre>
            <button
              type="button"
              className="btn btn-primary mt-5"
              onClick={() => window.location.reload()}
            >
              重开鬼门关
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);