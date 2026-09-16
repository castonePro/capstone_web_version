"use client";

/**
 * 지도 렌더링 중 발생하는 예외(예: 구글 지도 스크립트 내부 오류, 잘못된 API 키 형식 등)를
 * 잡아서 화면 전체가 하얗게 죽는 것을 막고 대체 화면을 보여준다.
 *
 * React 에러 바운더리는 클래스 컴포넌트로만 구현 가능하다 (getDerivedStateFromError는
 * 함수 컴포넌트의 훅으로 대체할 수 없음).
 *
 * resetKey가 바뀌면(예: 표시할 좌표가 달라짐) 에러 상태를 초기화해서 다시 렌더링을 시도한다 —
 * 한 번의 일시적인 오류 때문에 세션 내내 지도가 안 뜨는 걸 방지한다.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[MapErrorBoundary] 지도 렌더링 중 오류 발생:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
